import type { components } from "@/types/api";

// Response types (FastAPI doesn't specify these, so we define them manually)
export interface ChatSessionResponse {
  session_id: string;
}

export interface UploadResponse {
  doc_id: string;
  filename: string;
  status: string;
}

// Streaming response types
export type StreamTokenChunk = components["schemas"]["StreamTokenChunk"];
export type StreamMetadataChunk = components["schemas"]["StreamMetadataChunk"];

export type StreamChunk = StreamTokenChunk | StreamMetadataChunk;

// Frontend UI types (existing types from components)
export interface Message {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
  citations?: Array<{
    source: string;
    page?: number;
    similarity?: number;
    doc_id?: string;
    snippet?: string;
  }>;
  isEmptyResult?: boolean;
  canRetry?: boolean;
  originalQuery?: string;
}
