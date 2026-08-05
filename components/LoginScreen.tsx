"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Button, Card, FormField, Input } from "@/components/ui";

export function LoginScreen({
  loginName,
  setLoginName,
  loginPassword,
  setLoginPassword,
  loginError,
  login,
}: {
  loginName: string;
  setLoginName: (value: string) => void;
  loginPassword: string;
  setLoginPassword: (value: string) => void;
  loginError: string;
  login: () => void;
}) {
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStatus, setForgotStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [forgotError, setForgotError] = useState("");

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setForgotError("");
    const email = forgotEmail.trim();
    if (!email) { setForgotError("Please enter your email address."); return; }

    setForgotStatus("sending");

    // Build redirectTo from env var if available, otherwise fall back to window.location.origin.
    const base =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== "undefined" ? window.location.origin : "");
    const redirectTo = `${base}/auth/callback`;

    const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      setForgotStatus("error");
      setForgotError(error.message);
    } else {
      setForgotStatus("sent");
    }
  }

  function backToLogin() {
    setShowForgot(false);
    setForgotEmail("");
    setForgotStatus("idle");
    setForgotError("");
  }

  if (showForgot) {
    return (
      <div className="login-wrap">
        <Card className="w-full max-w-[540px]">
          <div className="login-logo-wrap">
            <img src="/rca-logo.png" alt="Referee College of Australia logo" className="login-logo" />
          </div>

          <p className="text-xs font-bold uppercase tracking-wide text-accent">Account Recovery</p>
          <h1 className="text-xl font-bold tracking-tight text-text">Forgot Password</h1>

          {forgotStatus === "sent" ? (
            <div className="grid gap-3 mt-4">
              <p className="mt-1 text-sm text-muted">
                If an account exists for <strong>{forgotEmail}</strong>, a password reset link has been sent. Check your inbox.
              </p>
              <Button variant="secondary" onClick={backToLogin}>Back to Login</Button>
            </div>
          ) : (
            <form className="grid gap-3 mt-4" onSubmit={handleForgotPassword}>
              <FormField label="Email" htmlFor="forgot-email" error={forgotError} required>
                <Input
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => { setForgotEmail(e.target.value); setForgotError(""); }}
                  placeholder="Your account email address"
                  autoFocus
                  required
                />
              </FormField>

              <Button type="submit" variant="primary" disabled={forgotStatus === "sending"}>
                {forgotStatus === "sending" ? "Sending…" : "Send Reset Link"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-fit justify-start px-0 h-auto underline"
                onClick={backToLogin}
              >
                Back to Login
              </Button>
            </form>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="login-wrap">
      <Card className="w-full max-w-[540px]">
        <div className="login-logo-wrap">
          <img src="/rca-logo.png" alt="Referee College of Australia logo" className="login-logo" />
        </div>

        <p className="text-xs font-bold uppercase tracking-wide text-accent">RefCoach</p>
        <h1 className="text-xl font-bold tracking-tight text-text">Sign in to your account</h1>

        <div className="grid gap-3 mt-4">
          <FormField label="Email" htmlFor="login-email">
            <Input
              id="login-email"
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              placeholder="Email address"
            />
          </FormField>

          <FormField label="Password" htmlFor="login-password">
            <Input
              id="login-password"
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Password"
              onKeyDown={(e) => { if (e.key === "Enter") login(); }}
            />
          </FormField>

          <Button variant="primary" onClick={login}>Login</Button>

          {loginError && <p className="text-xs font-medium text-red-400">{loginError}</p>}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-fit justify-start px-0 h-auto underline"
            onClick={() => setShowForgot(true)}
          >
            Forgot password?
          </Button>

          <p className="mt-1 text-sm text-muted">
            Sign in using your RefCoach email and password.
          </p>
        </div>
      </Card>
    </div>
  );
}
