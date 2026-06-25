import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  // Derive base origin: prefer configured site URL, fall back to request origin.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin;

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) =>
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          ),
      },
    }
  );

  // --- token_hash path (invite / recovery email links) ---
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });

    if (error) {
      console.error("[auth/callback] verifyOtp error:", error.message);
      const errorParam = encodeURIComponent(error.message);
      return NextResponse.redirect(`${siteUrl}/?error=${errorParam}`);
    }

    // Route to the correct post-auth page based on link type.
    if (type === "invite") {
      return NextResponse.redirect(`${siteUrl}/auth/set-password`);
    }
    if (type === "recovery") {
      return NextResponse.redirect(`${siteUrl}/auth/reset-password`);
    }

    // Any other valid OTP type (e.g. email confirmation) → home.
    return NextResponse.redirect(`${siteUrl}/`);
  }

  // --- PKCE code path (OAuth or magic-link with code param) ---
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/callback] exchangeCodeForSession error:", error.message);
      const errorParam = encodeURIComponent(error.message);
      return NextResponse.redirect(`${siteUrl}/?error=${errorParam}`);
    }

    return NextResponse.redirect(`${siteUrl}/`);
  }

  // No recognised params — redirect home with a generic error.
  return NextResponse.redirect(`${siteUrl}/?error=${encodeURIComponent("Invalid or missing authentication token.")}`);
}
