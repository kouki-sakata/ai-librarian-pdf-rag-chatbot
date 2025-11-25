import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatInterface } from "@/components/chat-interface";

vi.mock("@/hooks/use-chat", () => ({
  useChat: () => ({
    messages: [],
    isLoading: false,
    sessionId: "session-1",
    sessionError: null,
    isInitializingSession: false,
    initSession: vi.fn(),
    sendMessage: vi.fn(),
    addMessage: vi.fn(),
    removeMessage: vi.fn(),
  }),
}));

describe("ChatInterface responsive layout", () => {
  it("uses viewport-aware heights for mobile and desktop", () => {
    render(<ChatInterface />);

    const card = screen.getByTestId("chat-card");
    expect(card.className).toContain("h-[70vh]");
    expect(card.className).toContain("lg:h-[calc(100vh-8rem)]");

    const scrollArea = screen.getByTestId("chat-scroll");
    expect(scrollArea.className).toContain("flex-1");
    expect(scrollArea.className).toContain("min-h-0");
  });
});
