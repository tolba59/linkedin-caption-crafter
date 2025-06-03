import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { GeminiCaptionResponse, GroundingMetadata } from '../../types'; // Adjusted path

// API_KEY will be set as an environment variable on your Netlify dashboard
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("CRITICAL: API_KEY for Gemini is not set in the serverless function environment.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const PROMPT_TEMPLATE = (url: string) => `
You are an expert LinkedIn social media assistant. A user has provided the following URL: ${url}

If this is a YouTube video URL, leverage your search capabilities to thoroughly understand the video's *content*. This includes identifying its main topics, key arguments, core message, and significant takeaways. Do not rely solely on the video title or its immediate description. Base your captions on the actual substance and purpose of the video as discoverable through web search.
If it's an article, analyze its core message and key information.

Based on this analysis, generate TWO (2) distinct LinkedIn post caption options and relevant hashtags for each.

Each caption should be:
- Clear and concise.
- Engaging.
- Ideally under 200-250 characters, but prioritize impact and clarity.

Include 3-4 relevant and effective hashtags for each option.

Return your response as a JSON object string with the following structure:
{
  "options": [
    {
      "caption": "Your first generated caption here.",
      "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"]
    },
    {
      "caption": "Your second generated caption here.",
      "hashtags": ["#hashtagA", "#hashtagB", "#hashtagC"]
    }
  ]
}
Ensure the output is ONLY the JSON object string. Do not wrap it in markdown (e.g., \`\`\`json ... \`\`\`).
`;

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { Allow: 'POST', 'Content-Type': 'application/json' },
      body: JSON.stringify({ captionData: null, groundingMetadata: null, error: `Method ${event.httpMethod} Not Allowed` }),
    };
  }

  if (!API_KEY) {
    console.error("API Key not configured on server. Cannot connect to Gemini.");
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ captionData: null, groundingMetadata: null, error: "API Key not configured on the server. Cannot connect to Gemini." }),
    };
  }

  let url: string;
  try {
    if (!event.body) {
      throw new Error("Request body is missing.");
    }
    const body = JSON.parse(event.body);
    url = body.url;
    if (!url || typeof url !== 'string') {
      throw new Error("URL is missing or invalid in the request body.");
    }
  } catch (e: any) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ captionData: null, groundingMetadata: null, error: `Invalid request body: ${e.message}` }),
    };
  }

  try {
    const model = 'gemini-2.5-flash-preview-04-17';
    const promptContent = PROMPT_TEMPLATE(url);

    const geminiResponse: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: promptContent,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });
    
    let responseText = geminiResponse.text;
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    let jsonStr = "";
    if (jsonMatch && jsonMatch[0]) {
      jsonStr = jsonMatch[0].trim();
    } else {
        console.warn("Could not find a clear JSON block in the Gemini response. Attempting to use the full response text.");
        jsonStr = responseText.trim();
    }
    
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const fenceMatch = jsonStr.match(fenceRegex);
    if (fenceMatch && fenceMatch[2]) {
      jsonStr = fenceMatch[2].trim();
    }

    try {
      const parsedData: GeminiCaptionResponse = JSON.parse(jsonStr);
      if (parsedData && Array.isArray(parsedData.options) && parsedData.options.length > 0 &&
          parsedData.options.every(opt => typeof opt.caption === 'string' && Array.isArray(opt.hashtags))) {
        const groundingMetadata: GroundingMetadata | null = geminiResponse.candidates?.[0]?.groundingMetadata || null;
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ captionData: parsedData, groundingMetadata }),
        };
      } else {
        console.error("Parsed JSON from Gemini does not match expected structure:", parsedData);
         if ((parsedData as any).caption && (parsedData as any).hashtags) { // Fallback for single option if accidentally returned
            const singleOptionFallback: GeminiCaptionResponse = {
                options: [{
                    caption: (parsedData as any).caption,
                    hashtags: (parsedData as any).hashtags
                }]
            };
            return {
                statusCode: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ captionData: singleOptionFallback, groundingMetadata: null})
            };
        }
        return {
          statusCode: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ captionData: null, groundingMetadata: null, error: "Received unexpected data format from AI. Raw: " + jsonStr }),
        };
      }
    } catch (e: any) {
      console.error("Failed to parse JSON response from Gemini in Netlify function:", e, "Raw JSON string attempted:", jsonStr, "Full response text:", responseText);
       if(responseText.length > 10 && !jsonStr.startsWith("{")) { 
          const fallbackOption: GeminiCaptionResponse = {
              options: [{
                  caption: `AI Response (could not extract or parse JSON from server):\n${responseText}`,
                  hashtags: []
              }]
          };
          return {
              statusCode: 200,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ captionData: fallbackOption, groundingMetadata: geminiResponse.candidates?.[0]?.groundingMetadata || null })
          };
      }
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ captionData: null, groundingMetadata: geminiResponse.candidates?.[0]?.groundingMetadata || null, error: "Failed to understand AI's response. Details: " + e.message }),
      };
    }

  } catch (error: any) {
    console.error("Error in Netlify function calling Gemini:", error);
    let errorMessage = "Failed to generate caption due to an API error on the server.";
    if (error.message) {
      errorMessage += ` Details: ${error.message}`;
    }
     if (error.toString().includes("API key not valid")) {
        errorMessage = "The configured API Key on the server is invalid.";
    } else if (error.toString().includes("quota")) {
        errorMessage = "API quota exceeded. Please check your Gemini API usage on the server.";
    }
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ captionData: null, groundingMetadata: null, error: errorMessage }),
    };
  }
};

export { handler };
