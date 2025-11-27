"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
      toast.error("認証エラー", { description: message });
    }
  }, [searchParams]);

  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error("ログイン失敗", { description: error.message });
      } else {
        toast.success("ログイン成功");
        router.push("/");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInAnonymously();

      if (error) {
        toast.error("ゲストログイン失敗", { description: error.message });
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
        toast.error("Googleログイン失敗", {
          description: isProviderDisabled
            ? "Supabase ダッシュボードで Google プロバイダを有効化し、リダイレクト URL を登録してください。"
            : error.message,
        });
        setLoading(false);
      }
      // 成功時は Supabase 側でリダイレクトされる
    } catch (error) {
      setLoading(false);
      toast.error("Googleログイン失敗", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <div className="w-full max-w-md space-y-8 p-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">AI Librarian</h1>
        <p className="mt-2 text-muted-foreground">PDFベースのRAGチャットボット</p>
      </div>

      <form onSubmit={handleEmailLogin} className="space-y-4">
        <div>
          <Input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <div>
          <Input
            type="password"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "ログイン中..." : "ログイン"}
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
          {loading ? "リダイレクト中..." : "Googleでログイン"}
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
