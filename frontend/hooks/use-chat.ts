import { useState } from "react";
import { Message, ChatSession } from "@/types";
import { getChatErrorMessage } from "@/lib/error-messages";
import { toast } from "sonner";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isInitializingSession, setIsInitializingSession] = useState(false);

  const initSession = async () => {
    setIsInitializingSession(true);
    setSessionError(null);
    try {
      const res = await fetch("http://localhost:8000/api/v1/chat/sessions", {
        method: "POST",
      });
      if (res.ok) {
        const data: ChatSession = await res.json();
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
  };

  const sendMessage = async (query: string) => {
    if (!sessionId) return;

    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/v1/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
      let assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
      };

      setMessages((prev) => [...prev, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);

        assistantMessage = {
          ...assistantMessage,
          content: assistantMessage.content + chunk,
        };

        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = assistantMessage;
          return newMessages;
        });
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
    setMessages((prev) =>
      prev.filter((msg) => msg.originalQuery !== originalQuery)
    );
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
