import { useCallback, useState } from "react";
import { toast } from "sonner";
import { getChatErrorMessage } from "@/lib/error-messages";
import type {
  ChatSessionResponse,
  Message,
  StreamChunk,
  StreamMetadataChunk,
  StreamTokenChunk,
} from "@/types";

type RawStreamChunk = Partial<StreamMetadataChunk & StreamTokenChunk> & {
  type?: StreamChunk["type"];
};

const isTokenChunk = (payload: RawStreamChunk | StreamTokenChunk): payload is StreamTokenChunk =>
  payload.type === "token" && typeof payload.content === "string";

const isMetadataChunk = (
  payload: RawStreamChunk | StreamMetadataChunk
): payload is StreamMetadataChunk =>
  payload.type === "metadata" && Array.isArray(payload.citations);

const getAuthToken = () => {
  if (typeof window === "undefined") return null;
  const candidates = [
    localStorage.getItem("sb-access-token"),
    localStorage.getItem("supabase.auth.token"),
  ].filter(Boolean) as string[];

  for (const raw of candidates) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.access_token) return parsed.access_token;
      if (parsed?.currentSession?.access_token) return parsed.currentSession.access_token;
    } catch {
      return raw;
    }
  }

  return process.env.NEXT_PUBLIC_DEV_JWT || null;
};

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isInitializingSession, setIsInitializingSession] = useState(false);

  const initSession = useCallback(async () => {
    setIsInitializingSession(true);
    setSessionError(null);
    try {
      const token = getAuthToken();
      const res = await fetch("http://localhost:8000/api/v1/chat/sessions", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data: ChatSessionResponse = await res.json();
        setSessionId(data.session_id);
      } else {
        throw new Error("Session initialization failed");
      }
    } catch (error) {
      const errorMessage = getChatErrorMessage(error, "session");
      setSessionError(errorMessage);
      toast.error("セッション初期化失敗", {
        description: errorMessage,
      });
    } finally {
      setIsInitializingSession(false);
    }
  }, []);

  const sendMessage = async (query: string) => {
    if (!sessionId) return;

    setIsLoading(true);

    try {
      const token = getAuthToken();
      const res = await fetch("http://localhost:8000/api/v1/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          session_id: sessionId,
          query: query,
        }),
      });

      if (!res.ok) {
        throw new Error(getChatErrorMessage(res, "message"));
      }
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
        citations: [],
        isEmptyResult: false,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          let payload: RawStreamChunk;
          try {
            payload = JSON.parse(line) as RawStreamChunk;
          } catch (err) {
            console.warn("Failed to parse stream line", line, err);
            continue;
          }

          if (isTokenChunk(payload)) {
            const tokenPayload = payload as StreamTokenChunk;
            assistantMessage = {
              ...assistantMessage,
              content: assistantMessage.content + tokenPayload.content,
            };
          }

          if (isMetadataChunk(payload)) {
            const metadataPayload = payload as StreamMetadataChunk;
            assistantMessage = {
              ...assistantMessage,
              citations: metadataPayload.citations?.map((c) => ({
                source: c.doc_id, // Map doc_id to source
                similarity: 0, // Default similarity as API doesn't provide it yet
                page: undefined,
              })),
              isEmptyResult: Boolean(metadataPayload.empty),
            };
          }

          setMessages((prev) => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = assistantMessage;
            return newMessages;
          });
        }
      }

      if (buffer.trim()) {
        try {
          const payload = JSON.parse(buffer) as RawStreamChunk;
          if (isMetadataChunk(payload)) {
            const metadataPayload = payload as StreamMetadataChunk;
            assistantMessage = {
              ...assistantMessage,
              citations: metadataPayload.citations?.map((c) => ({
                source: c.doc_id,
                similarity: 0,
                page: undefined,
              })),
              isEmptyResult: Boolean(metadataPayload.empty),
            };
            setMessages((prev) => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = assistantMessage;
              return newMessages;
            });
          }
        } catch {
          // ignore trailing parse errors
        }
      }
    } catch (error) {
      const errorMessage = getChatErrorMessage(error, "message");

      // Add error message to chat
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: "error",
        content: errorMessage,
        canRetry: true,
        originalQuery: query,
      };
      setMessages((prev) => [...prev, errorMsg]);

      toast.error("メッセージ送信失敗", {
        description: errorMessage,
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const removeMessage = (originalQuery: string) => {
    setMessages((prev) => prev.filter((msg) => msg.originalQuery !== originalQuery));
  };

  return {
    messages,
    isLoading,
    sessionId,
    sessionError,
    isInitializingSession,
    initSession,
    sendMessage,
    addMessage,
    removeMessage,
  };
}
