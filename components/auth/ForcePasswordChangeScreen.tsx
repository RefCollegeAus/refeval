"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Button, Card, FormField, Input } from "@/components/ui";

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
      <Card className="w-full max-w-[540px]">
        <div className="login-logo-wrap">
          <img src="/rca-logo.png" alt="Referee College of Australia logo" className="login-logo" />
        </div>

        <p className="text-xs font-bold uppercase tracking-wide text-accent">Welcome to RefEval</p>
        <h1 className="text-xl font-bold tracking-tight text-text">Set a New Password</h1>
        <p className="mt-1 text-sm text-muted">
          Your account was created with a temporary password. Choose your own password to continue.
        </p>

        <form className="grid gap-3 mt-4" onSubmit={handleSubmit}>
          <FormField label="New password" htmlFor="force-change-password">
            <Input
              id="force-change-password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              placeholder="At least 8 characters"
              autoFocus
              required
            />
          </FormField>

          <FormField label="Confirm password" htmlFor="force-change-confirm">
            <Input
              id="force-change-confirm"
              type="password"
              value={confirm}
              onChange={(e) => { setConfirm(e.target.value); setError(""); }}
              placeholder="Repeat your password"
              required
            />
          </FormField>

          {error && <p className="text-xs font-medium text-red-400">{error}</p>}

          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Saving…" : "Set Password & Continue"}
          </Button>
        </form>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit justify-start px-0 h-auto underline mt-3"
          onClick={onLogout}
        >
          Log out
        </Button>
      </Card>
    </div>
  );
}
