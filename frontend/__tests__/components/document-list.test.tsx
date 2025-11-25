import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentList } from "@/components/document-list";

// Mock fetch
const fetchMock = vi.fn();
global.fetch = fetchMock as unknown as typeof fetch;

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

    render(<DocumentList />);

    await waitFor(() => {
      expect(screen.getByText("test.pdf")).toBeInTheDocument();
      expect(screen.getByText("test2.pdf")).toBeInTheDocument();
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

    render(<DocumentList />);

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

    render(<DocumentList />);

    await waitFor(() => {
      expect(screen.getByText(/1.*MB/i)).toBeInTheDocument();
    });
  });
});
