import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HistorySidebar } from "@/components/chat-history-sidebar";
import { SessionProvider } from "@/contexts/session-context";

// Mock fetch
const fetchMock = vi.fn();
global.fetch = fetchMock as unknown as typeof fetch;

// Mock Sidebar components
vi.mock("@/components/ui/sidebar", () => ({
  Sidebar: ({ children }: { children: ReactNode }) => <div data-testid="sidebar">{children}</div>,
  SidebarContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarGroupContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarGroupLabel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarMenuItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarMenuButton: ({ children, onClick }: { children: ReactNode; onClick: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  SidebarMenuAction: ({ children, onClick }: { children: ReactNode; onClick: () => void }) => (
    <button type="button" onClick={onClick} aria-label="Delete">
      {children}
    </button>
  ),
  SidebarHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  useSidebar: () => ({
    isMobile: false,
    state: "expanded",
    setOpenMobile: vi.fn(),
  }),
}));

const mockSessions = [
  { id: "1", title: "Session 1", updated_at: "2023-01-01T00:00:00Z" },
  { id: "2", title: "Session 2", updated_at: "2023-01-02T00:00:00Z" },
];

describe("HistorySidebar", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    fetchMock.mockReset();
  });

  it("renders session list", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockSessions, total: 2 }),
    });

    render(
      <SessionProvider>
        <HistorySidebar />
      </SessionProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("Session 1")).toBeInTheDocument();
      expect(screen.getByText("Session 2")).toBeInTheDocument();
    });
  });

  it("selects a session", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockSessions, total: 2 }),
    });

    render(
      <SessionProvider>
        <HistorySidebar />
      </SessionProvider>
    );

    await waitFor(() => screen.getByText("Session 1"));
    fireEvent.click(screen.getByText("Session 1"));
  });

  it("renders New Chat button", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [], total: 0 }),
    });

    render(
      <SessionProvider>
        <HistorySidebar />
      </SessionProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("New Chat")).toBeInTheDocument();
    });
  });

  it("deletes a session", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockSessions, total: 2 }),
    });

    render(
      <SessionProvider>
        <HistorySidebar />
      </SessionProvider>
    );

    await waitFor(() => screen.getByText("Session 1"));

    // Mock delete API
    fetchMock.mockResolvedValueOnce({ ok: true });
    // Mock list refresh
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [mockSessions[1]], total: 1 }),
    });

    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    // Check for confirmation dialog
    expect(screen.getByText("Delete Session")).toBeInTheDocument();

    // Click confirm
    fireEvent.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/v1/chat/sessions/1",
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  it("loads more sessions", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: mockSessions, total: 20 }), // Total 20 implies more pages if limit is 20? No, limit is 20.
    });
    // Actually if total > current, show load more.
    // Let's say we have 2 items but total is 4.
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          { id: "3", title: "Session 3", updated_at: "2023-01-03T00:00:00Z" },
          { id: "4", title: "Session 4", updated_at: "2023-01-04T00:00:00Z" },
        ],
        total: 4,
      }),
    });

    render(
      <SessionProvider>
        <HistorySidebar />
      </SessionProvider>
    );

    await waitFor(() => screen.getByText("Session 1"));

    const loadMoreBtn = screen.getByText("Load More");
    fireEvent.click(loadMoreBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("offset=2"));
    });
  });
});
