export interface Message {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
  canRetry?: boolean;
  originalQuery?: string;
}

export interface ChatSession {
  session_id: string;
}

export interface UploadResponse {
  status: string;
  doc_id: string;
  filename: string;
}
