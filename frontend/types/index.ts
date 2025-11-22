export interface Message {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
  citations?: Citation[];
  canRetry?: boolean;
  originalQuery?: string;
}

export interface Citation {
  source: string;
  page?: number;
  similarity?: number;
}

export interface ChatSession {
  session_id: string;
}

export interface UploadResponse {
  status: string;
  doc_id: string;
  filename: string;
}
