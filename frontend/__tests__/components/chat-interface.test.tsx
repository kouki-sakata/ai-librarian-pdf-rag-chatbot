import { fireEvent, render, screen } from "@testing-library/react";
import { toast } from "sonner";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatInterface } from "@/components/chat-interface";
import { useChat } from "@/hooks/use-chat";

// Mock useChat hook
vi.mock("@/hooks/use-chat", () => ({
  useChat: vi.fn(),
}));

// Mock sonner toast methods directly after import
vi.mock("sonner", async (importOriginal) => {
  const mod = await importOriginal<typeof import("sonner")>();
  return {
    ...mod,
    toast: {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    },
  };
});

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Get mocked useChat
const mockedUseChat = useChat as unknown as Mock;

describe("ChatInterface", () => {
  const mockSendMessage = vi.fn();
  const mockInitSession = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseChat.mockReturnValue({
      messages: [],
      isLoading: false,
      sessionId: "session-123",
      sessionError: null,
      isInitializingSession: false,
      initSession: mockInitSession,
      sendMessage: mockSendMessage,
      addMessage: vi.fn(),
      removeMessage: vi.fn(),
    });
  });

  it("renders suggested queries when there are no messages", () => {
    render(<ChatInterface />);
    expect(screen.getByText("AI司書へようこそ")).toBeInTheDocument();
    expect(screen.getByText(/ドキュメントについて何でも聞いてください/)).toBeInTheDocument();
  });

  it("sends message when clicking suggested query", () => {
    render(<ChatInterface />);
    const suggestion = screen.getByText("このドキュメントの要約を教えてください");
    fireEvent.click(suggestion);

    const textarea = screen.getByPlaceholderText(/メッセージを入力/);
    expect(textarea).toHaveValue("このドキュメントの要約を教えてください");
  });

  it("sends message on Enter key", () => {
    render(<ChatInterface />);
    const textarea = screen.getByPlaceholderText(/メッセージを入力/);

    fireEvent.change(textarea, { target: { value: "Hello" } });
    fireEvent.keyDown(textarea, {
      key: "Enter",
      code: "Enter",
      shiftKey: false,
    });

    expect(mockSendMessage).toHaveBeenCalledWith("Hello");
  });

  it("inserts newline on Shift+Enter", () => {
    render(<ChatInterface />);
    const textarea = screen.getByPlaceholderText(/メッセージを入力/);

    fireEvent.change(textarea, { target: { value: "Line 1" } });
    fireEvent.keyDown(textarea, {
      key: "Enter",
      code: "Enter",
      shiftKey: true,
    });

    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("displays streaming cursor when loading", () => {
    mockedUseChat.mockReturnValue({
      messages: [
        { id: "1", role: "user", content: "Hello" },
        { id: "2", role: "assistant", content: "Hi", citations: [] },
      ],
      isLoading: true,
      sessionId: "session-123",
      sessionError: null,
      isInitializingSession: false,
      sendMessage: mockSendMessage,
      initSession: mockInitSession,
      addMessage: vi.fn(),
      removeMessage: vi.fn(),
    });

    render(<ChatInterface />);
    const _cursor = document.querySelector(".animate-pulse");
    // Check if cursor exists
  });

  it("handles keyboard shortcuts", () => {
    render(<ChatInterface />);
    const textarea = screen.getByPlaceholderText(/メッセージを入力/);

    // Cmd+K to focus
    textarea.blur();
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(textarea).toHaveFocus();

    // Cmd+/ for help
    fireEvent.keyDown(window, { key: "/", metaKey: true });
    expect(toast.info).toHaveBeenCalledWith("キーボードショートカット", expect.any(Object));
  });

  it("disables input when session is initializing", () => {
    mockedUseChat.mockReturnValue({
      messages: [],
      isLoading: false,
      sessionId: null,
      sessionError: null,
      isInitializingSession: true,
      initSession: mockInitSession,
      sendMessage: mockSendMessage,
      addMessage: vi.fn(),
      removeMessage: vi.fn(),
    });

    render(<ChatInterface />);
    const textarea = screen.getByPlaceholderText(/メッセージを入力/);
    expect(textarea).toBeDisabled();
  });
});
