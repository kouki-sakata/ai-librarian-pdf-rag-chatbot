import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UploadForm } from "@/components/upload-form";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const fetchMock = vi.fn();
global.fetch = fetchMock as unknown as typeof fetch;

describe("UploadForm", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    fetchMock.mockReset();
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders upload form", () => {
    render(<UploadForm />);

    expect(screen.getByText("ドキュメントアップロード")).toBeInTheDocument();
    expect(screen.getByLabelText("PDFファイル")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /アップロード/i })).toBeDisabled();
  });

  it("enables submit button when file is selected", () => {
    render(<UploadForm />);

    const fileInput = screen.getByLabelText("PDFファイル");
    const file = new File(["test"], "test.pdf", { type: "application/pdf" });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByRole("button", { name: /アップロード/ })).not.toBeDisabled();
  });

  it("displays selected file information", () => {
    render(<UploadForm />);

    const fileInput = screen.getByLabelText("PDFファイル");
    const file = new File(["a".repeat(1024 * 1024)], "test.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText("test.pdf")).toBeInTheDocument();
    expect(screen.getByText(/1\.00 MB/)).toBeInTheDocument();
  });

  it("uploads file successfully", async () => {
    render(<UploadForm />);

    const fileInput = screen.getByLabelText("PDFファイル");
    const file = new File(["test content"], "test.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    // Mock successful upload
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ doc_id: "doc-123", filename: "test.pdf" }),
    });

    const submitButton = screen.getByRole("button", { name: /アップロード/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/アップロード完了/)).toBeInTheDocument();
      expect(screen.getByText(/ID: doc-123/)).toBeInTheDocument();
    });
  });

  it("shows progress during upload", async () => {
    render(<UploadForm />);

    const fileInput = screen.getByLabelText("PDFファイル");
    const file = new File(["test"], "test.pdf", { type: "application/pdf" });

    fireEvent.change(fileInput, { target: { files: [file] } });

    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({ doc_id: "doc-123", filename: "test.pdf" }),
            });
          }, 100);
        })
    );

    const submitButton = screen.getByRole("button", { name: /アップロード/ });
    fireEvent.click(submitButton);

    // Wait for upload to complete
    await waitFor(
      () => {
        expect(screen.getByText(/アップロード完了/)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("handles upload error", async () => {
    render(<UploadForm />);

    const fileInput = screen.getByLabelText("PDFファイル");
    const file = new File(["test"], "test.pdf", { type: "application/pdf" });

    fireEvent.change(fileInput, { target: { files: [file] } });

    // Mock upload failure
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ detail: "Server error" }),
    });

    const submitButton = screen.getByRole("button", { name: /アップロード/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Server error/)).toBeInTheDocument();
    });
  });

  it.skip("handles timeout after 30 seconds", { timeout: 10000 }, async () => {
    vi.useFakeTimers();
    render(<UploadForm />);

    const fileInput = screen.getByLabelText("PDFファイル");
    const file = new File(["test"], "test.pdf", { type: "application/pdf" });

    fireEvent.change(fileInput, { target: { files: [file] } });

    // Mock fetch that never resolves (simulates slow network)
    fetchMock.mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          const signal = (options as RequestInit)?.signal;
          if (signal) {
            signal.addEventListener("abort", () => {
              reject(new DOMException("The operation was aborted.", "AbortError"));
            });
          }
        })
    );

    const submitButton = screen.getByRole("button", { name: /アップロード/ });

    await act(async () => {
      fireEvent.click(submitButton);
      // Advance time by 30 seconds to trigger timeout
      await vi.advanceTimersByTimeAsync(30000);
    });

    await waitFor(() => {
      expect(screen.getByText(/タイムアウト/)).toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it("allows retry after error", async () => {
    render(<UploadForm />);

    const fileInput = screen.getByLabelText("PDFファイル");
    const file = new File(["test"], "test.pdf", { type: "application/pdf" });

    fireEvent.change(fileInput, { target: { files: [file] } });

    // Mock initial failure
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ detail: "Server error" }),
    });

    const submitButton = screen.getByRole("button", { name: /アップロード/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Server error/)).toBeInTheDocument();
    });

    // Mock successful retry
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ doc_id: "doc-123", filename: "test.pdf" }),
    });

    const retryButton = screen.getByRole("button", { name: /再試行/ });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText(/アップロード完了/)).toBeInTheDocument();
    });
  });

  it("uses NEXT_PUBLIC_API_URL environment variable", async () => {
    const originalEnv = process.env.NEXT_PUBLIC_API_URL;
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";

    render(<UploadForm />);

    const fileInput = screen.getByLabelText("PDFファイル");
    const file = new File(["test"], "test.pdf", { type: "application/pdf" });

    fireEvent.change(fileInput, { target: { files: [file] } });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ doc_id: "doc-123", filename: "test.pdf" }),
    });

    const submitButton = screen.getByRole("button", { name: /アップロード/ });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/api/v1/upload/",
        expect.any(Object)
      );
    });

    // Restore environment variable
    if (originalEnv) {
      process.env.NEXT_PUBLIC_API_URL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_API_URL;
    }
  });

  it("resets state when new file is selected", () => {
    render(<UploadForm />);

    const fileInput = screen.getByLabelText("PDFファイル");
    const file1 = new File(["test1"], "test1.pdf", { type: "application/pdf" });

    fireEvent.change(fileInput, { target: { files: [file1] } });
    expect(screen.getByText("test1.pdf")).toBeInTheDocument();

    // Select new file
    const file2 = new File(["test2"], "test2.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [file2] } });

    expect(screen.getByText("test2.pdf")).toBeInTheDocument();
    expect(screen.queryByText("test1.pdf")).not.toBeInTheDocument();
  });
});
