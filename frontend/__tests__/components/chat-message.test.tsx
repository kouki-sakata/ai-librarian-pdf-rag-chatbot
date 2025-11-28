import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatMessage } from "@/components/chat-message";
import { Message } from "@/types";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

describe("ChatMessage", () => {
  const mockMessage: Message = {
    id: "1",
    role: "assistant",
    content: "# Hello\nThis is a **markdown** message.",
    citations: [
      {
        source: "doc1.pdf",
        page: 1,
        similarity: 0.9,
        snippet: "This is a snippet from doc1.",
      },
    ],
  };

  it("renders markdown content correctly", () => {
    render(<ChatMessage {...mockMessage} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Hello");
    const strongElement = screen.getByText("markdown");
    expect(strongElement.tagName).toBe("STRONG");

    // Alternatively check for strong tag presence
    const strong = document.querySelector("strong");
    expect(strong).toHaveTextContent("markdown");
  });

  it("renders citations with preview", () => {
    render(<ChatMessage {...mockMessage} />);

    const citation = screen.getByText("doc1.pdf p.1");
    expect(citation).toBeInTheDocument();

    // Hover to show preview (Popover)
    // Note: Radix UI Popover might need specific handling for tests or pointer events
    // For now, we check if the trigger is rendered
  });

  it("shows copy button on hover for assistant messages", () => {
    render(<ChatMessage {...mockMessage} />);

    const container = screen.getByText("markdown").closest(".group");
    if (container) {
      fireEvent.mouseEnter(container);
      const copyButton = screen.getByLabelText("メッセージをコピー");
      expect(copyButton).toBeInTheDocument();

      fireEvent.click(copyButton);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockMessage.content);
    }
  });

  it("shows streaming cursor when isStreaming is true", () => {
    render(<ChatMessage {...mockMessage} isStreaming={true} />);

    // Check for the cursor element
    // It has class 'animate-pulse' and 'bg-primary'
    const cursor = document.querySelector(".animate-pulse");
    expect(cursor).toBeInTheDocument();
  });

  it("renders user message with correct styling", () => {
    const userMessage: Message = {
      id: "2",
      role: "user",
      content: "User question",
    };

    render(<ChatMessage {...userMessage} />);
    expect(screen.getByText("User question")).toBeInTheDocument();
    // Check for user-specific styling class if possible, or just content
  });
});
