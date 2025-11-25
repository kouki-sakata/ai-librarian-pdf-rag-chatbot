import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Home from "../../app/page";

// Mock child components
vi.mock("@/components/chat-interface", () => ({
  ChatInterface: () => <div data-testid="chat-interface">Chat Interface Mock</div>,
}));

vi.mock("@/components/upload-form", () => ({
  UploadForm: () => <div data-testid="upload-form">Upload Form Mock</div>,
}));

vi.mock("@/components/ui/sonner", () => ({
  Toaster: () => <div data-testid="toaster">Toaster Mock</div>,
}));

describe("Home Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the home page", () => {
    render(<Home />);

    expect(screen.getByTestId("main-shell")).toBeInTheDocument();
  });

  it("renders ChatInterface component", () => {
    render(<Home />);

    expect(screen.getByTestId("chat-interface")).toBeInTheDocument();
    expect(screen.getByText("Chat Interface Mock")).toBeInTheDocument();
  });

  it("renders UploadForm component", () => {
    render(<Home />);

    expect(screen.getByTestId("upload-form")).toBeInTheDocument();
    expect(screen.getByText("Upload Form Mock")).toBeInTheDocument();
  });

  it("has proper layout structure", () => {
    render(<Home />);

    const mainShell = screen.getByTestId("main-shell");
    const contentGrid = screen.getByTestId("content-grid");
    const uploadForm = screen.getByTestId("upload-form");
    const chatInterface = screen.getByTestId("chat-interface");
    const toaster = screen.getByTestId("toaster");

    // Verify all main elements are present
    expect(mainShell).toBeInTheDocument();
    expect(contentGrid).toBeInTheDocument();
    expect(uploadForm).toBeInTheDocument();
    expect(chatInterface).toBeInTheDocument();
    expect(toaster).toBeInTheDocument();

    // Verify structure: content grid should contain upload form and chat interface
    expect(mainShell).toContainElement(contentGrid);
    expect(contentGrid).toContainElement(uploadForm);
    expect(contentGrid).toContainElement(chatInterface);
  });
});
