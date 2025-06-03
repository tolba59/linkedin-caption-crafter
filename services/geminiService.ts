import { GeminiCaptionResponse, GroundingMetadata } from '../types';

export const generateLinkedInCaption = async (url: string): Promise<{ captionData: GeminiCaptionResponse | null, groundingMetadata: GroundingMetadata | null, error?: string }> => {
  try {
    // Updated to Netlify's function endpoint
    const response = await fetch('/.netlify/functions/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      let errorBody;
      try {
        errorBody = await response.json();
      } catch (e) {
        // If parsing error body fails, use status text
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      throw new Error(errorBody?.error || `API request failed: ${response.status}`);
    }

    const data = await response.json();
    // The backend now returns the exact structure we need.
    return data;

  } catch (error: any) {
    console.error("Error calling backend caption generation service:", error);
    let errorMessage = "Failed to generate caption due to a network or server error.";
    if (error.message) {
      errorMessage = error.message; // Use the error message from the fetch failure or backend
    }
    return { captionData: null, groundingMetadata: null, error: errorMessage };
  }
};
