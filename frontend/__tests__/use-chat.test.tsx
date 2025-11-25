import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChat } from "../hooks/use-chat";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Mock Supabase client
const mockGetSession = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: mockGetSession,
    },
  }),
}));

const encoder = new TextEncoder();

const buildStreamResponse = (lines: string[]) => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(`${line}\n`));
      }
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
};

describe("useChat hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset Supabase mock to default null state
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("parses streaming citations metadata into the assistant message", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    // session creation
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ session_id: "session-1" }), { status: 200 })
    );
    // chat stream
    fetchMock.mockResolvedValueOnce(
      buildStreamResponse([
        '{"type":"token","content":"こんにちは"}',
        '{"type":"metadata","citations":[{"source":"doc.pdf","page":2,"similarity":0.9}],"results":1}',
      ])
    );

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.initSession();
    });

    await act(async () => {
      await result.current.sendMessage("質問");
    });

    const lastMessage = result.current.messages.at(-1);
    expect(lastMessage?.role).toBe("assistant");
    expect(lastMessage?.citations?.[0]).toMatchObject({
      source: "doc.pdf",
      page: 2,
    });
    expect(lastMessage?.isEmptyResult).toBe(false);
    expect(lastMessage?.content).toContain("こんにちは");
  });

  it("marks empty results and shows user-friendly guidance", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ session_id: "session-2" }), { status: 200 })
    );
    fetchMock.mockResolvedValueOnce(
      buildStreamResponse([
        '{"type":"token","content":"該当する情報がありませんでした"}',
        '{"type":"metadata","citations":[],"empty":true}',
      ])
    );

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.initSession();
    });

    await act(async () => {
      await result.current.sendMessage("空振りテスト");
    });

    const lastMessage = result.current.messages.at(-1);
    expect(lastMessage?.isEmptyResult).toBe(true);
    expect(lastMessage?.citations).toEqual([]);
    expect(lastMessage?.content).toContain("該当する情報");
  });

  it("adds retryable error message when streaming fails", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ session_id: "session-3" }), { status: 200 })
    );
    fetchMock.mockResolvedValueOnce(new Response("", { status: 500 }));

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.initSession();
    });

    await act(async () => {
      await result.current.sendMessage("失敗テスト");
    });

    const lastMessage = result.current.messages.at(-1);
    expect(lastMessage?.role).toBe("error");
    expect(lastMessage?.canRetry).toBe(true);
    expect(lastMessage?.originalQuery).toBe("失敗テスト");
    expect(lastMessage?.content.length).toBeGreaterThan(0);
  });

  it("retrieves auth token from Supabase client instead of localStorage", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    // Mock Supabase session with token
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: "supabase-test-token-123",
        },
      },
      error: null,
    });

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ session_id: "session-auth-test" }), {
        status: 200,
      })
    );

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.initSession();
    });

    // Verify that the fetch call includes the Supabase token
    const sessionInitCall = fetchMock.mock.calls[0];
    expect(sessionInitCall[1]?.headers).toEqual({
      Authorization: "Bearer supabase-test-token-123",
    });

    expect(result.current.sessionId).toBe("session-auth-test");
  });

  it("aborts fetch request after 30 seconds timeout", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "test-token" } },
      error: null,
    });

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ session_id: "session-timeout" }), {
        status: 200,
      })
    );

    // Mock fetch to simulate abort after delay
    let _capturedController: AbortController | null = null;
    fetchMock.mockImplementationOnce((_url, options) => {
      const requestOptions = options as RequestInit | undefined;
      const signalWithController = requestOptions?.signal as
        | (AbortSignal & {
            _controller?: AbortController;
          })
        | undefined;

      _capturedController = signalWithController?._controller ?? null;

      return new Promise((_resolve, reject) => {
        const signal = requestOptions?.signal;
        if (signal) {
          signal.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          });
        }
        // Never resolve - will be aborted by timeout
      });
    });

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.initSession();
    });

    // Start sending message
    // Send message and advance timers within a single act to avoid warnings
    await act(async () => {
      const sendPromise = result.current.sendMessage("timeout test");
      await vi.advanceTimersByTimeAsync(30000);
      await sendPromise;
    });

    // Verify error message was added
    const lastMessage = result.current.messages.at(-1);
    expect(lastMessage?.role).toBe("error");
    expect(lastMessage?.content).toContain("タイムアウト");

    vi.useRealTimers();
  });

  it("uses NEXT_PUBLIC_API_URL environment variable for API calls", async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    // Set environment variable
    const originalEnv = process.env.NEXT_PUBLIC_API_URL;
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";

    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "test-token" } },
      error: null,
    });

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ session_id: "session-env-test" }), {
        status: 200,
      })
    );
    fetchMock.mockResolvedValueOnce(
      buildStreamResponse([
        '{"type":"token","content":"test"}',
        '{"type":"metadata","citations":[]}',
      ])
    );

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.initSession();
    });

    await act(async () => {
      await result.current.sendMessage("env test");
    });

    // Verify API calls use the environment variable
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example.com/api/v1/chat/sessions");
    expect(fetchMock.mock.calls[1][0]).toBe("https://api.example.com/api/v1/chat");

    // Restore original environment variable
    if (originalEnv) {
      process.env.NEXT_PUBLIC_API_URL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_API_URL;
    }
  });
});
