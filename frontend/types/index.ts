import type { components, paths } from "@/types/api";

type ChatRequest = components["schemas"]["ChatRequest"];
type UploadRequestBody = components["schemas"]["Body_upload_document_api_v1_upload__post"];

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
export type StreamCitation = components["schemas"]["StreamCitation"];

export type StreamChunk = StreamTokenChunk | StreamMetadataChunk;

// API Client types
export type { ChatRequest, UploadRequestBody };
export type { paths, components };

// Frontend UI types (existing types from components)
export interface Message {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
  citations?: Array<{
    source: string;
    page?: number;
    similarity?: number;
  }>;
  isEmptyResult?: boolean;
  canRetry?: boolean;
  originalQuery?: string;
}

export interface ChatSession {
  session_id: string;
}
