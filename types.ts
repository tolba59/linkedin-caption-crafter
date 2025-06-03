
export interface CaptionOption {
  caption: string;
  hashtags: string[];
}

export interface GeminiCaptionResponse {
  options: CaptionOption[];
}

export interface GroundingChunk {
  web?: {
    uri?: string; // Changed to optional
    title?: string; // Changed to optional
  };
  // Other types of chunks can be added if needed
}

export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
  // Other grounding metadata fields can be added
}
