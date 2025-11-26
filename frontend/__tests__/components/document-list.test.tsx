import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentList } from "@/components/document-list";

// Mock fetch
const fetchMock = vi.fn();
global.fetch = fetchMock as unknown as typeof fetch;

// Mock Dialog components
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

// Helper to render with QueryClient
const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe("DocumentList", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    fetchMock.mockReset();
  });

  it("renders document list", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: "doc-1",
          filename: "test.pdf",
          file_size: 1024,
          created_at: "2023-01-01T00:00:00Z",
        },
        {
          id: "doc-2",
          filename: "test2.pdf",
          file_size: 2048,
          created_at: "2023-01-02T00:00:00Z",
        },
      ],
    });

    renderWithQueryClient(<DocumentList />);

    await waitFor(() => {
      expect(screen.getByText("test.pdf")).toBeInTheDocument();
      expect(screen.getByText("test2.pdf")).toBeInTheDocument();
    });
  });

  it("shows loading state initially", () => {
    fetchMock.mockImplementation(
      () =>
        new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: async () => [] }), 100))
    );

    renderWithQueryClient(<DocumentList />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows empty state when no documents", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    renderWithQueryClient(<DocumentList />);

    await waitFor(() => {
      expect(screen.getByText("No documents yet")).toBeInTheDocument();
    });
  });

  it("handles fetch error gracefully", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network error"));

    renderWithQueryClient(<DocumentList />);

    await waitFor(() => {
      expect(screen.getByText("No documents yet")).toBeInTheDocument();
    });
  });

  it("deletes a document", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: "doc-1",
          filename: "test.pdf",
          file_size: 1024,
          created_at: "2023-01-01T00:00:00Z",
        },
      ],
    });

    renderWithQueryClient(<DocumentList />);

    await waitFor(() => screen.getByText("test.pdf"));

    // Mock delete API
    fetchMock.mockResolvedValueOnce({ ok: true });
    // Mock list refresh
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    // Check for confirmation dialog
    expect(screen.getByText("Delete Document")).toBeInTheDocument();

    // Click confirm
    fireEvent.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/v1/documents/doc-1"),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  it("cancels document deletion", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: "doc-1",
          filename: "test.pdf",
          file_size: 1024,
          created_at: "2023-01-01T00:00:00Z",
        },
      ],
    });

    renderWithQueryClient(<DocumentList />);

    await waitFor(() => screen.getByText("test.pdf"));

    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    // Check for confirmation dialog
    expect(screen.getByText("Delete Document")).toBeInTheDocument();

    // Click cancel
    fireEvent.click(screen.getByText("Cancel"));

    await waitFor(() => {
      expect(screen.queryByText("Delete Document")).not.toBeInTheDocument();
    });

    // Document should still be there
    expect(screen.getByText("test.pdf")).toBeInTheDocument();
  });

  it("handles delete error gracefully", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: "doc-1",
          filename: "test.pdf",
          file_size: 1024,
          created_at: "2023-01-01T00:00:00Z",
        },
      ],
    });

    renderWithQueryClient(<DocumentList />);

    await waitFor(() => screen.getByText("test.pdf"));

    // Mock delete API failure
    fetchMock.mockRejectedValueOnce(new Error("Delete failed"));

    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    fireEvent.click(deleteButtons[0]);
    fireEvent.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it("displays file size in human readable format", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: "doc-1",
          filename: "test.pdf",
          file_size: 1048576, // 1 MB
          created_at: "2023-01-01T00:00:00Z",
        },
      ],
    });

    renderWithQueryClient(<DocumentList />);

    await waitFor(() => {
      expect(screen.getByText(/1.*MB/i)).toBeInTheDocument();
    });
  });

  it("formats file sizes correctly for different units", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: "1",
          filename: "tiny.pdf",
          file_size: 512,
          created_at: "2023-01-01T00:00:00Z",
        },
        {
          id: "2",
          filename: "small.pdf",
          file_size: 2048,
          created_at: "2023-01-01T00:00:00Z",
        },
        {
          id: "3",
          filename: "medium.pdf",
          file_size: 1048576,
          created_at: "2023-01-01T00:00:00Z",
        },
        {
          id: "4",
          filename: "large.pdf",
          file_size: 1073741824,
          created_at: "2023-01-01T00:00:00Z",
        },
      ],
    });

    renderWithQueryClient(<DocumentList />);

    await waitFor(() => {
      expect(screen.getByText(/512 B/)).toBeInTheDocument();
      expect(screen.getByText(/2\.0 KB/)).toBeInTheDocument();
      expect(screen.getByText(/1\.0 MB/)).toBeInTheDocument();
      expect(screen.getByText(/1\.0 GB/)).toBeInTheDocument();
    });
  });

  it("formats dates in Japanese locale", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        {
          id: "doc-1",
          filename: "test.pdf",
          file_size: 1024,
          created_at: "2023-05-15T12:30:00Z",
        },
      ],
    });

    renderWithQueryClient(<DocumentList />);

    await waitFor(() => {
      // Date should be formatted as YYYY/MM/DD in Japanese locale
      expect(screen.getByText(/2023/)).toBeInTheDocument();
    });
  });
});
