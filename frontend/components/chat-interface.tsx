"use client";

import { AlertCircle, Loader2, RefreshCw, Send } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useChat } from "@/hooks/use-chat";
import { Message } from "@/types";
import { ChatMessage } from "./chat-message";
import { SuggestedQueries } from "./suggested-queries";
import { TypingIndicator } from "./typing-indicator";

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to focus input
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        textareaRef.current?.focus();
      }

      // Cmd+/ or Ctrl+/ to show shortcuts help
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        toast.info("キーボードショートカット", {
          description: (
            <div className="text-xs space-y-1 mt-1">
              <div className="flex justify-between gap-4">
                <span>入力欄フォーカス</span>
                <kbd className="bg-muted px-1 rounded">Cmd+K</kbd>
              </div>
              <div className="flex justify-between gap-4">
                <span>送信</span>
                <kbd className="bg-muted px-1 rounded">Enter</kbd>
              </div>
              <div className="flex justify-between gap-4">
                <span>改行</span>
                <kbd className="bg-muted px-1 rounded">Shift+Enter</kbd>
              </div>
            </div>
          ),
          duration: 4000,
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    // Only scroll if there are messages
    if (messages.length === 0) return;

    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      ) as HTMLElement | null;
      if (scrollContainer) {
        const canSmoothScroll =
          typeof (scrollContainer as HTMLElement & { scrollTo?: unknown }).scrollTo === "function";
        if (canSmoothScroll) {
          // JSdom環境ではscrollToが未実装のため存在チェックを行う
          (
            scrollContainer as HTMLElement & {
              scrollTo: (options: ScrollToOptions) => void;
            }
          ).scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: "smooth",
          });
        } else {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }
    }
  }, [messages.length]);

  useEffect(() => {
    initSession();
  }, [initSession]);

  const handleSubmit = async () => {
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const handleRetryMessage = (originalQuery?: string) => {
    if (!originalQuery) return;
    removeMessage(originalQuery);
    sendMessage(originalQuery);
  };

  if (sessionError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
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
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full relative bg-background animate-fade-in"
      data-testid="chat-interface"
    >
      {/* Header - Mobile only */}
      <div className="lg:hidden p-4 border-b flex items-center justify-center font-semibold glass sticky top-0 z-10">
        AI司書チャット
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden relative">
        <ScrollArea data-testid="chat-scroll" className="h-full" ref={scrollAreaRef}>
          <div className="flex flex-col min-h-full pb-32">
            {messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 mt-20">
                <div className="text-2xl font-semibold mb-4 text-foreground">AI司書へようこそ</div>
                <p className="mb-8">ドキュメントについて何でも聞いてください!</p>
                <SuggestedQueries onSelect={(query) => setInput(query)} />
              </div>
            ) : (
              <div className="flex flex-col w-full max-w-3xl mx-auto px-4 py-6">
                {messages.map((msg, index) =>
                  msg.role === "error" ? (
                    <div key={msg.id} className="mb-6">
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
                      isStreaming={
                        isLoading && msg.role === "assistant" && index === messages.length - 1
                      }
                    />
                  )
                )}
                {/* Typing indicator */}
                {isLoading && <TypingIndicator />}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-background via-background to-transparent pt-10 pb-6 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="relative flex items-end w-full gap-2">
            <Textarea
              placeholder="メッセージを入力... (Shift+Enterで改行)"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading || !sessionId}
              rows={1}
              className="resize-none pr-12 py-3 text-base rounded-2xl shadow-sm border-muted-foreground/20 focus-visible:ring-1 focus-visible:ring-ring min-h-[48px] max-h-[200px]"
              style={{
                height: "auto",
                maxHeight: "200px",
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
              }}
            />
            <Button
              type="button"
              size="icon"
              onClick={handleSubmit}
              disabled={isLoading || !input.trim() || !sessionId}
              className="h-12 w-12 rounded-xl flex-shrink-0 smooth-hover ripple-effect shadow-md"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          <div className="text-center text-xs text-muted-foreground mt-2">
            AIは間違いを犯す可能性があります。重要な情報は確認してください。
          </div>
        </div>
      </div>
    </div>
  );
}
