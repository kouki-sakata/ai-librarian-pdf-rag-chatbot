import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SessionProvider, useSession } from "@/contexts/session-context";

// Test component to consume the context
const TestComponent = () => {
  const { sessionId, setSessionId } = useSession();

  return (
    <div>
      <div data-testid="session-id">{sessionId || "null"}</div>
      <button type="button" onClick={() => setSessionId("new-session-id")}>
        Set Session
      </button>
      <button type="button" onClick={() => setSessionId(null)}>
        Clear Session
      </button>
    </div>
  );
};

describe("SessionContext", () => {
  it("provides default session state as null", () => {
    render(
      <SessionProvider>
        <TestComponent />
      </SessionProvider>
    );

    expect(screen.getByTestId("session-id").textContent).toBe("null");
  });

  it("updates session state", () => {
    render(
      <SessionProvider>
        <TestComponent />
      </SessionProvider>
    );

    const button = screen.getByText("Set Session");
    fireEvent.click(button);

    expect(screen.getByTestId("session-id").textContent).toBe("new-session-id");
  });

  it("clears session state", () => {
    render(
      <SessionProvider>
        <TestComponent />
      </SessionProvider>
    );

    const setButton = screen.getByText("Set Session");
    fireEvent.click(setButton);
    expect(screen.getByTestId("session-id").textContent).toBe("new-session-id");

    const clearButton = screen.getByText("Clear Session");
    fireEvent.click(clearButton);
    expect(screen.getByTestId("session-id").textContent).toBe("null");
  });
});
