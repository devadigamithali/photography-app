"use client";

import { useState, FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardBody } from "@/components/ui/Card";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/admin/dashboard`
              : undefined,
        },
      });
      if (error) throw error;
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <Card className="w-full max-w-sm">
        <CardBody>
          <h1 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Photographer Sign In
          </h1>
          <p className="mb-6 text-sm text-zinc-500">
            We&apos;ll email you a magic link — no password needed.
          </p>

          {status === "sent" ? (
            <p className="rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-300">
              Check your inbox at <strong>{email}</strong> for a sign-in link.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {status === "error" && errorMessage && (
                <p className="text-sm text-red-600">{errorMessage}</p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={status === "sending"}
              >
                {status === "sending" ? "Sending link..." : "Send magic link"}
              </Button>
            </form>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
