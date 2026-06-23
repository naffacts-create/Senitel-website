import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Exchanges the magic-link code for a session, then redirects to dashboard. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("Magic link exchange failed:", error);
    return NextResponse.redirect(`${origin}/login?error=invalid-code`);
  }
  return NextResponse.redirect(`${origin}/login?error=missing-code`);
}
