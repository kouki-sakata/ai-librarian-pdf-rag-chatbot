"use client";

import { AlertCircle, Loader2, RefreshCw, Send } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat } from "@/hooks/use-chat";
import { Message } from "@/types";
import { ChatMessage } from "./chat-message";

export function ChatInterface() {
  const {
    messages,
    isLoading,
    sessionId,
    sessionError,
    isInitializingSession,
    initSession,
    sendMessage,
    addMessage,
    removeMessage,
  } = useChat();

  const [input, setInput] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, []);

  useEffect(() => {
    initSession();
  }, [initSession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !sessionId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    addMessage(userMessage);
    setInput("");

    await sendMessage(userMessage.content);
  };

  const handleRetryMessage = (originalQuery?: string) => {
    if (!originalQuery) return;
    removeMessage(originalQuery);
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
    <Card
      data-testid="chat-card"
      className="w-full h-[70vh] min-h-[520px] lg:h-[calc(100vh-8rem)] lg:min-h-[640px] flex flex-col"
    >
      <CardHeader>
        <CardTitle>AI司書チャット</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea data-testid="chat-scroll" className="flex-1 min-h-0 p-4" ref={scrollAreaRef}>
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              ドキュメントについて何でも聞いてください!
            </div>
          ) : (
            messages.map((msg) =>
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
                          onClick={() => handleRetryMessage(msg.originalQuery)}
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
                <ChatMessage
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  citations={msg.citations}
                  isEmptyResult={msg.isEmptyResult}
                />
              )
            )
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
