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

    const container = screen.getByTestId("chat-interface");
    expect(container.className).toContain("h-full");
    expect(container.className).toContain("flex");
    expect(container.className).toContain("flex-col");

    const scrollArea = screen.getByTestId("chat-scroll");
    expect(scrollArea.className).toContain("h-full");
  });
});
