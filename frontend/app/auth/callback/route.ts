import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  console.log("[Auth Callback] Starting OAuth callback processing");
  console.log("[Auth Callback] Code present:", !!code);
  console.log("[Auth Callback] Origin:", origin);
  console.log("[Auth Callback] Next path:", next);

  if (code) {
    try {
      const supabase = await createClient();
      console.log("[Auth Callback] Exchanging code for session...");

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("[Auth Callback] Code exchange failed:", error.message);
        console.error("[Auth Callback] Error details:", error);
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
      }

      console.log("[Auth Callback] Code exchange successful");
      console.log("[Auth Callback] User:", data.user?.email);
      console.log("[Auth Callback] Session:", !!data.session);

      const redirectUrl = `${origin}${next}`;
      console.log("[Auth Callback] Redirecting to:", redirectUrl);
      return NextResponse.redirect(redirectUrl);
    } catch (err) {
      console.error("[Auth Callback] Unexpected error during code exchange:", err);
      return NextResponse.redirect(`${origin}/login?error=unexpected_error`);
    }
  }

  // Return to login page if code is missing
  console.warn("[Auth Callback] No code in callback URL, redirecting to login");
  return NextResponse.redirect(`${origin}/login?error=missing_code`);
}
