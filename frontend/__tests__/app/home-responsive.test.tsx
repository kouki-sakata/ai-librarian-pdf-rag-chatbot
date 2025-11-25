import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import RootLayout from "@/app/layout";
import Home from "@/app/page";

vi.mock("next/font/google", () => ({
  Geist: () => ({ className: "font-geist", variable: "--font-geist" }),
  Geist_Mono: () => ({ className: "font-geist-mono", variable: "--font-geist-mono" }),
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

describe("Home responsive layout", () => {
  it("renders mobile header and responsive grid", () => {
    const Layout = RootLayout as unknown as ({ children }: { children: ReactNode }) => JSX.Element;

    render(
      <Layout>
        <Home />
      </Layout>
    );

    const header = screen.getByTestId("mobile-header");
    expect(header).toHaveClass("md:hidden");

    const grid = screen.getByTestId("content-grid");
    expect(grid.className).toContain("grid");
    expect(grid.className).toContain("lg:grid-cols-[360px,1fr]");
  });
});
