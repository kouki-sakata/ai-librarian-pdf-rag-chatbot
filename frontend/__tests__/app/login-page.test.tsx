import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from "../../app/(auth)/login/page";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signInAnonymously: vi.fn(),
  signInWithOAuth: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      signUp: mocks.signUp,
      signInAnonymously: mocks.signInAnonymously,
      signInWithOAuth: mocks.signInWithOAuth,
    },
  }),
}));

const renderLoginPage = () => render(<LoginPage />);

describe("LoginPage sign-up flow", () => {
  beforeEach(() => {
    for (const fn of Object.values(mocks)) {
      fn.mockClear();
    }
  });

  it("初期表示はログインモードで送信ボタンがログイン", () => {
    renderLoginPage();

    expect(screen.getByTestId("auth-mode-login")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("auth-submit")).toHaveTextContent("ログイン");
    expect(screen.queryByTestId("password-confirm")).not.toBeInTheDocument();
  });

  it("新規登録タブを選ぶと確認用パスワードが表示され、ボタン文言が登録になる", async () => {
    renderLoginPage();

    fireEvent.click(screen.getByTestId("auth-mode-signup"));

    expect(screen.getByTestId("password-confirm")).toBeInTheDocument();
    expect(screen.getByTestId("auth-submit")).toHaveTextContent("登録");
  });

  it("パスワードが短い場合 signUp を呼ばずエラーを出す", async () => {
    renderLoginPage();
    fireEvent.click(screen.getByTestId("auth-mode-signup"));

    fireEvent.change(screen.getByTestId("email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByTestId("password"), {
      target: { value: "short" },
    });
    fireEvent.change(screen.getByTestId("password-confirm"), {
      target: { value: "short" },
    });

    fireEvent.click(screen.getByTestId("auth-submit"));

    expect(mocks.signUp).not.toHaveBeenCalled();
    expect(screen.getByText("パスワードは8文字以上で入力してください")).toBeInTheDocument();
  });

  it("確認用パスワード不一致で signUp を呼ばない", async () => {
    renderLoginPage();
    fireEvent.click(screen.getByTestId("auth-mode-signup"));

    fireEvent.change(screen.getByTestId("email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByTestId("password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByTestId("password-confirm"), {
      target: { value: "password999" },
    });

    fireEvent.click(screen.getByTestId("auth-submit"));

    expect(mocks.signUp).not.toHaveBeenCalled();
    expect(screen.getByText("パスワードが一致しません")).toBeInTheDocument();
  });

  it("signUp 成功 (セッション無し) でトースト表示とフォームリセット", async () => {
    mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });

    renderLoginPage();
    fireEvent.click(screen.getByTestId("auth-mode-signup"));

    fireEvent.change(screen.getByTestId("email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByTestId("password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByTestId("password-confirm"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByTestId("auth-submit"));

    await waitFor(() => expect(mocks.signUp).toHaveBeenCalled());
    expect(mocks.toastSuccess).toHaveBeenCalled();
    expect(mocks.push).not.toHaveBeenCalled();
    expect((screen.getByTestId("email") as HTMLInputElement).value).toBe("");
  });

  it("signUp 成功 (セッションあり) でリダイレクトする", async () => {
    mocks.signUp.mockResolvedValue({
      data: { session: { access_token: "token" } },
      error: null,
    });

    renderLoginPage();
    fireEvent.click(screen.getByTestId("auth-mode-signup"));

    fireEvent.change(screen.getByTestId("email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByTestId("password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByTestId("password-confirm"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByTestId("auth-submit"));

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith("/");
      expect(mocks.refresh).toHaveBeenCalled();
    });
  });

  it("signUp 失敗でエラートーストを表示", async () => {
    mocks.signUp.mockResolvedValue({
      data: { session: null },
      error: { message: "登録エラー" },
    });

    renderLoginPage();
    fireEvent.click(screen.getByTestId("auth-mode-signup"));

    fireEvent.change(screen.getByTestId("email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByTestId("password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByTestId("password-confirm"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByTestId("auth-submit"));

    await waitFor(() => expect(screen.getByText("登録エラー")).toBeInTheDocument());
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("送信中はボタンが disabled になる", async () => {
    mocks.signUp.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              data: { session: null },
              error: null,
            });
          }, 10);
        })
    );

    renderLoginPage();
    fireEvent.click(screen.getByTestId("auth-mode-signup"));

    fireEvent.change(screen.getByTestId("email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByTestId("password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByTestId("password-confirm"), {
      target: { value: "password123" },
    });

    const submitButton = screen.getByTestId("auth-submit");
    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();

    await waitFor(() => expect(submitButton).not.toBeDisabled());
  });

  it("ログインモードで signInWithPassword が呼ばれリダイレクトする", async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: null });

    renderLoginPage();

    fireEvent.change(screen.getByTestId("email"), {
      target: { value: "user@example.com" },
    });
    fireEvent.change(screen.getByTestId("password"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByTestId("auth-submit"));

    await waitFor(() => expect(mocks.signInWithPassword).toHaveBeenCalled());
    expect(mocks.push).toHaveBeenCalledWith("/");
    expect(mocks.refresh).toHaveBeenCalled();
  });
});
