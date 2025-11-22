"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChatMessage } from "./chat-message";
import { Send, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { getChatErrorMessage } from "@/lib/error-messages";

interface Message {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
  canRetry?: boolean;
  originalQuery?: string;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isInitializingSession, setIsInitializingSession] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Initialize session
  const initSession = async () => {
    setIsInitializingSession(true);
    setSessionError(null);
    try {
      const res = await fetch("http://localhost:8000/api/v1/chat/sessions", {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
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

  useEffect(() => {
    initSession();
  }, []);

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
            content: assistantMessage.content + chunk
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !sessionId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    
    await sendMessage(userMessage.content);
  };

  const handleRetryMessage = (originalQuery: string) => {
    // Remove the error message
    setMessages((prev) => prev.filter((msg) => msg.originalQuery !== originalQuery));
    // Resend the message
    sendMessage(originalQuery);
  };

  if (sessionError) {
    return (
      <Card className="w-full h-[600px] flex flex-col items-center justify-center">
        <CardContent className="text-center space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{sessionError}</AlertDescription>
          </Alert>
          <Button onClick={initSession} disabled={isInitializingSession}>
            {isInitializingSession ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                再試行中...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                再試行
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle>AI司書チャット</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              ドキュメントについて何でも聞いてください!
            </div>
          ) : (
            messages.map((msg) => (
              msg.role === "error" ? (
                <div key={msg.id} className="mb-4">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                      <span>{msg.content}</span>
                      {msg.canRetry && msg.originalQuery && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetryMessage(msg.originalQuery!)}
                          className="ml-2"
                        >
                          <RefreshCw className="mr-2 h-3 w-3" />
                          再送信
                        </Button>
                      )}
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
              )
            ))
          )}
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex w-full gap-2">
          <Input
            placeholder="質問を入力してください..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading || !sessionId}
          />
          <Button type="submit" disabled={isLoading || !input.trim() || !sessionId}>
            {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}

