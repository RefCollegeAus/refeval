"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function SetPasswordPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Verify there is a live session (token was exchanged by /auth/callback).
  // If not, the user arrived here directly — send them home.
  useEffect(() => {
    async function checkSession() {
      const { data } = await getSupabaseClient().auth.getUser();
      if (!data.user) router.replace("/");
      else setChecked(true);
    }
    checkSession();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await getSupabaseClient().auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.replace("/");
  }

  if (!checked) {
    return (
      <div className="login-wrap">
        <section className="panel login-panel">
          <p className="hint">Verifying your invitation…</p>
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

        <p className="eyebrow">Welcome to RefEval</p>
        <h1>Set Your Password</h1>
        <p className="hint" style={{ marginTop: 8 }}>
          Choose a password to activate your account.
        </p>

        <form className="form-stack" style={{ marginTop: 18 }} onSubmit={handleSubmit}>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="At least 8 characters"
              autoFocus
              required
            />
          </label>

          <label>
            Confirm password
            <input
              type="password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(""); }}
              placeholder="Repeat your password"
              required
            />
          </label>

          {error && <p className="danger-text">{error}</p>}

          <button type="submit" className="primary" disabled={loading}>
            {loading ? "Saving…" : "Set Password & Sign In"}
          </button>
        </form>
      </section>
    </div>
  );
}
