import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import Home from "@/app/(main)/page";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SessionProvider } from "@/contexts/session-context";

vi.mock("next/font/google", () => ({
  Geist: () => ({ className: "font-geist", variable: "--font-geist" }),
  Geist_Mono: () => ({
    className: "font-geist-mono",
    variable: "--font-geist-mono",
  }),
}));

vi.mock("@/components/app-sidebar", () => ({
  AppSidebar: () => <div data-testid="app-sidebar" />,
}));

vi.mock("@/components/ui/sonner", () => ({
  Toaster: () => <div data-testid="toaster" />,
}));

if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// Mock heavy child components to focus on layout structure
vi.mock("@/components/chat-interface", () => ({
  ChatInterface: () => <div data-testid="chat-interface" />,
}));

vi.mock("@/components/upload-form", () => ({
  UploadForm: () => <div data-testid="upload-form" />,
}));

const TestLayout = ({ children }: { children: ReactNode }) => (
  <SessionProvider>
    <SidebarProvider>
      <SidebarInset className="bg-background min-h-svh">
        <header
          data-testid="mobile-header"
          className="md:hidden sticky top-0 z-20 flex items-center gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur"
        >
          <SidebarTrigger className="md:hidden" aria-label="メニューを開く" />
          <span className="text-sm font-medium text-muted-foreground">AI司書</span>
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  </SessionProvider>
);

describe("Home responsive layout", () => {
  it("renders mobile header and responsive grid", () => {
    render(
      <TestLayout>
        <Home />
      </TestLayout>
    );

    const header = screen.getByTestId("mobile-header");
    expect(header).toHaveClass("md:hidden");

    const grid = screen.getByTestId("content-grid");
    expect(grid.className).toContain("grid");
    expect(grid.className).toContain("lg:grid-cols-[360px,1fr]");
  });
});
