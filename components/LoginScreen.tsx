"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";

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

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

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
        <section className="panel login-panel">
          <div className="login-logo-wrap">
            <img src="/rca-logo.png" alt="Referee College of Australia logo" className="login-logo" />
          </div>

          <p className="eyebrow">Account Recovery</p>
          <h1>Forgot Password</h1>

          {forgotStatus === "sent" ? (
            <div className="form-stack" style={{ marginTop: 18 }}>
              <p className="hint">
                If an account exists for <strong>{forgotEmail}</strong>, a password reset link has been sent. Check your inbox.
              </p>
              <button className="primary" onClick={backToLogin}>Back to Login</button>
            </div>
          ) : (
            <form className="form-stack" style={{ marginTop: 18 }} onSubmit={handleForgotPassword}>
              <label>
                Email
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => { setForgotEmail(e.target.value); setForgotError(""); }}
                  placeholder="Your account email address"
                  autoFocus
                  required
                />
              </label>

              {forgotError && <p className="danger-text">{forgotError}</p>}

              <button type="submit" className="primary" disabled={forgotStatus === "sending"}>
                {forgotStatus === "sending" ? "Sending…" : "Send Reset Link"}
              </button>

              <button type="button" onClick={backToLogin} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", textDecoration: "underline", fontSize: "0.875rem" }}>
                Back to Login
              </button>
            </form>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="login-wrap">
      <section className="panel login-panel">
        <div className="login-logo-wrap">
          <img src="/rca-logo.png" alt="Referee College of Australia logo" className="login-logo" />
        </div>

        <p className="eyebrow">Login</p>
        <h1>Referee Development Platform</h1>

        <div className="form-stack" style={{ marginTop: 18 }}>
          <label>
            Email
            <input
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              placeholder="Email address"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Password"
              onKeyDown={(e) => { if (e.key === "Enter") login(); }}
            />
          </label>

          <button className="primary" onClick={login}>Login</button>

          {loginError && <p className="danger-text">{loginError}</p>}

          <button
            type="button"
            onClick={() => setShowForgot(true)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", textDecoration: "underline", fontSize: "0.875rem", textAlign: "left", padding: 0 }}
          >
            Forgot password?
          </button>

          <p className="hint">
            Sign in using your RefEval email and password.
          </p>
        </div>
      </section>
    </div>
  );
}
