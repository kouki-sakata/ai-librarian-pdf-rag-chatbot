"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatMessage } from "./chat-message";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
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
  useEffect(() => {
    async function initSession() {
      try {
        const res = await fetch("http://localhost:8000/api/v1/chat/sessions", {
          method: "POST",
        });
        if (res.ok) {
          const data = await res.json();
          setSessionId(data.session_id);
        }
      } catch (error) {
        console.error("Failed to init session", error);
      }
    }
    initSession();
  }, []);

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
    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/v1/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Note: In a real app, you'd attach the JWT token here
          // "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          session_id: sessionId,
          query: userMessage.content,
        }),
      });

      if (!res.ok) throw new Error("Failed to send message");
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
        // SSE format usually sends "data: ..." but our backend sends raw text chunks for simplicity in this demo.
        // If backend sends "data: ", we need to parse it.
        // Based on ChatService implementation, it yields raw content chunks.
        
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
      toast.error("Failed to get response");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle>AI Librarian Chat</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Ask me anything about your documents!
            </div>
          ) : (
            messages.map((msg) => (
              <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
            ))
          )}
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex w-full gap-2">
          <Input
            placeholder="Type your question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? <Loader2 className="animate-spin" /> : <Send />}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
