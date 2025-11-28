import { useCallback, useState } from "react";
import { getChatError } from "@/lib/error-messages";
import { showError } from "@/lib/feedback";
import { createClient } from "@/lib/supabase/client";
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

const getApiUrl = () => {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
};

const getAuthToken = async (): Promise<string | null> => {
  try {
    const supabase = createClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Supabase auth error:", error);
      return null;
    }

    return session?.access_token ?? null;
  } catch (error) {
    console.error("Failed to get Supabase session:", error);
    return null;
  }
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
      const token = await getAuthToken();
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/v1/chat/sessions`, {
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
      const errorDetail = getChatError(error, "session");
      setSessionError(errorDetail.description);
      showError(errorDetail);
    } finally {
      setIsInitializingSession(false);
    }
  }, []);

  const sendMessage = async (query: string) => {
    if (!sessionId) return;

    setIsLoading(true);

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 30000); // 30 seconds timeout

    try {
      const token = await getAuthToken();
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          session_id: sessionId,
          query: query,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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
                source: c.source,
                similarity: c.similarity ?? undefined,
                page: c.page ?? undefined,
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
                source: c.source,
                similarity: c.similarity ?? undefined,
                page: c.page ?? undefined,
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
      clearTimeout(timeoutId);

      const errorDetail = getChatError(error, "message");

      // Add error message to chat
      const errorMsg: Message = {
        id: Date.now().toString(),
        role: "error",
        content: `${errorDetail.title}: ${errorDetail.description}`,
        canRetry: errorDetail.canRetry,
        originalQuery: query,
      };
      setMessages((prev) => [...prev, errorMsg]);

      showError(errorDetail);
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
