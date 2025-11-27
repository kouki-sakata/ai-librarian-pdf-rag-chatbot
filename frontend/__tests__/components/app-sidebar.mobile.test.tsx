import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SessionProvider } from "@/contexts/session-context";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Force mobile rendering for the sidebar
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => true,
}));

// Keep sidebar children light
vi.mock("@/components/history-sidebar-content", () => ({
  HistorySidebarContent: () => <div>history</div>,
}));

vi.mock("@/components/document-list", () => ({
  DocumentList: () => <div>documents</div>,
}));

// Minimal button mock to avoid style noise
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children: ReactNode }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  }),
}));

describe("AppSidebar mobile behavior", () => {
  it("opens as a sheet via the mobile trigger", async () => {
    render(
      <SessionProvider>
        <SidebarProvider defaultOpen={false}>
          <AppSidebar />
          <SidebarTrigger className="md:hidden" aria-label="メニューを開く" />
        </SidebarProvider>
      </SessionProvider>
    );

    expect(document.querySelector('[data-mobile="true"]')).toBeNull();

    const trigger = screen.getByRole("button", { name: "メニューを開く" });
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(document.querySelector('[data-mobile="true"]')).not.toBeNull();
    });
  }, 10000);
});
