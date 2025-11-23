import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChat } from "../hooks/use-chat";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
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
});
