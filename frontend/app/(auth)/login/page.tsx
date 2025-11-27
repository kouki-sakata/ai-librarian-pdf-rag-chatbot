"use client";

import { TriangleAlertIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function LoginForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // URLからエラーメッセージを取得して表示
  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      const errorMessages: Record<string, string> = {
        missing_code: "認証コードが見つかりません",
        unexpected_error: "予期しないエラーが発生しました",
      };

      const message = errorMessages[error] || decodeURIComponent(error);
      setAuthError(message);
    }
  }, [searchParams]);

  const [validationErrors, setValidationErrors] = useState<{
    email?: string;
    password?: string;
    passwordConfirm?: string;
  }>({});

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setPasswordConfirm("");
    setValidationErrors({});
    setAuthError(null);
  };

  const handleEmailAuth = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setValidationErrors({});
    setAuthError(null);

    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setValidationErrors({
          email: "有効なメールアドレスを入力してください",
        });
        return;
      }

      const supabase = createClient();
      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;

      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setAuthError(error.message);
        } else {
          toast.success("ログイン成功");
          router.push("/");
          router.refresh();
        }
        return;
      }

      let hasError = false;
      const newErrors: typeof validationErrors = {};

      if (password.length < 8) {
        newErrors.password = "パスワードは8文字以上で入力してください";
        hasError = true;
      }

      if (password !== passwordConfirm) {
        newErrors.passwordConfirm = "パスワードが一致しません";
        hasError = true;
      }

      if (hasError) {
        setValidationErrors(newErrors);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) {
        setAuthError(error.message);
        return;
      }

      toast.success("確認メールを送信しました", {
        description: "メール内のリンクから認証を完了してください",
      });

      if (data.session) {
        router.push("/");
        router.refresh();
      } else {
        resetForm();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setAuthError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInAnonymously();

      if (error) {
        setAuthError(error.message);
      } else {
        toast.success("ゲストとしてログインしました");
        router.push("/");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setAuthError(null);

    try {
      const supabase = createClient();
      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });

      if (error) {
        const isProviderDisabled = error.message?.includes("provider is not enabled");
        const message = isProviderDisabled
          ? "Supabase ダッシュボードで Google プロバイダを有効化し、リダイレクト URL を登録してください。"
          : error.message;
        setAuthError(message);
        setLoading(false);
      }
      // 成功時は Supabase 側でリダイレクトされる
    } catch (error) {
      setLoading(false);
      setAuthError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 p-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">AI Librarian</h1>
        <p className="mt-2 text-muted-foreground">PDFベースのRAGチャットボット</p>
      </div>

      {authError && (
        <Alert variant="destructive">
          <TriangleAlertIcon className="h-4 w-4" />
          <AlertTitle>エラー</AlertTitle>
          <AlertDescription>{authError}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="認証モード">
        <Button
          type="button"
          data-testid="auth-mode-login"
          variant={mode === "login" ? "default" : "outline"}
          role="tab"
          aria-selected={mode === "login"}
          onClick={() => {
            setMode("login");
            resetForm();
          }}
          disabled={loading}
        >
          ログイン
        </Button>
        <Button
          type="button"
          data-testid="auth-mode-signup"
          variant={mode === "signup" ? "default" : "outline"}
          role="tab"
          aria-selected={mode === "signup"}
          onClick={() => {
            setMode("signup");
            resetForm();
          }}
          disabled={loading}
        >
          新規登録
        </Button>
      </div>

      <form onSubmit={handleEmailAuth} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            data-testid="email"
            aria-invalid={!!validationErrors.email}
            aria-describedby={validationErrors.email ? "email-error" : undefined}
          />
          {validationErrors.email && (
            <p id="email-error" className="text-sm text-destructive">
              {validationErrors.email}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            minLength={8}
            data-testid="password"
            aria-invalid={!!validationErrors.password}
            aria-describedby={validationErrors.password ? "password-error" : undefined}
          />
          {validationErrors.password && (
            <p id="password-error" className="text-sm text-destructive">
              {validationErrors.password}
            </p>
          )}
        </div>
        {mode === "signup" ? (
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="パスワード（確認）"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              disabled={loading}
              minLength={8}
              data-testid="password-confirm"
              aria-invalid={!!validationErrors.passwordConfirm}
              aria-describedby={
                validationErrors.passwordConfirm ? "password-confirm-error" : undefined
              }
            />
            {validationErrors.passwordConfirm && (
              <p id="password-confirm-error" className="text-sm text-destructive">
                {validationErrors.passwordConfirm}
              </p>
            )}
          </div>
        ) : null}
        <Button type="submit" disabled={loading} className="w-full" data-testid="auth-submit">
          {loading
            ? mode === "login"
              ? "ログイン中..."
              : "登録中..."
            : mode === "login"
              ? "ログイン"
              : "登録"}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">または</span>
        </div>
      </div>

      <div className="space-y-3">
        <Button onClick={handleGoogleLogin} disabled={loading} variant="outline" className="w-full">
          {loading ? (
            "リダイレクト中..."
          ) : (
            <>
              <GoogleIcon />
              Googleでログイン
            </>
          )}
        </Button>

        <Button onClick={handleGuestLogin} disabled={loading} variant="outline" className="w-full">
          {loading ? "ログイン中..." : "ゲストとして試す（登録不要）"}
        </Button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Suspense fallback={<div>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
