"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setBusy(false);
    if (error) {
      // Provide more helpful error messages
      let message = error.message;
      if (message.includes("rate")) {
        message = "Too many attempts. Please wait a few minutes before trying again.";
      }
      setError(message);
      return;
    }
    setSent(true);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-bold">Sign in to Sentinel</h1>
      <p className="mt-1 text-sm text-neutral-500">
        We&apos;ll email you a magic link — no password needed.
      </p>

      {sent ? (
        <div className="mt-6 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-ok">
          Check your inbox for a sign-in link.
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@agency.com"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send magic link"}
          </button>
          {error && <p className="text-sm text-danger">{error}</p>}
        </form>
      )}
    </main>
  );
}
