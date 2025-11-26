import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  // 開発環境と本番環境で使用する環境変数を明確に分離
  const isDevelopment = process.env.NODE_ENV === "development";

  let supabaseUrl: string | undefined;
  let supabaseKey: string | undefined;

  if (isDevelopment) {
    // 開発環境では開発用の環境変数を使用（必須）
    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_DEV_URL;
    supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_DEV_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "開発環境では NEXT_PUBLIC_SUPABASE_DEV_URL と NEXT_PUBLIC_SUPABASE_DEV_ANON_KEY を設定してください。\n" +
          "ローカルSupabaseを使用する場合: supabase start で起動し、supabase status で認証情報を確認してください。"
      );
    }
  } else {
    // 本番環境では本番用の環境変数を使用（必須）
    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "本番環境では NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください。\n" +
          "Vercelダッシュボードで環境変数を設定してください。"
      );
    }
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: "", ...options });
      },
    },
  });
}
