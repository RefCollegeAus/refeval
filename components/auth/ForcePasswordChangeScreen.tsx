"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

// Shown when a profile still has must_change_password set — admin-provisioned
// accounts land here instead of their normal home screen until they choose
// their own password. Nothing else in the app is reachable from this screen.
export function ForcePasswordChangeScreen({
  onComplete,
  onLogout,
}: {
  onComplete: () => void;
  onLogout: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    const supabase = getSupabaseClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ must_change_password: false })
        .eq("id", userData.user.id);
      if (profileError) {
        setLoading(false);
        setError(`Password saved, but couldn't clear the temporary-password flag: ${profileError.message}`);
        return;
      }
    }

    setLoading(false);
    onComplete();
  }

  return (
    <div className="login-wrap">
      <section className="panel login-panel">
        <div className="login-logo-wrap">
          <img src="/rca-logo.png" alt="Referee College of Australia logo" className="login-logo" />
        </div>

        <p className="eyebrow">Welcome to RefEval</p>
        <h1>Set a New Password</h1>
        <p className="hint" style={{ marginTop: 8 }}>
          Your account was created with a temporary password. Choose your own password to continue.
        </p>

        <form className="form-stack" style={{ marginTop: 18 }} onSubmit={handleSubmit}>
          <label>
            New password
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
            {loading ? "Saving…" : "Set Password & Continue"}
          </button>
        </form>

        <button
          type="button"
          onClick={onLogout}
          className="hint"
          style={{ marginTop: 14, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
        >
          Log out
        </button>
      </section>
    </div>
  );
}
