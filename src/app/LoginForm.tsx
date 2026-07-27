"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardBody } from "@/components/ui/Card";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.push("/admin/dashboard");
      router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <Card className="w-full max-w-sm">
        <CardBody>
          <h1 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Photographer Sign In
          </h1>
          <p className="mb-6 text-sm text-zinc-500">
            Sign in to manage your portfolio, calendar, and inquiries.
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            <Input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {errorMessage && (
              <p className="text-sm text-red-600">{errorMessage}</p>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardBody>
      </Card>

      <Link
        href="/browse"
        className="mt-6 text-sm text-zinc-500 underline underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        Skip login &mdash; browse the portfolio
      </Link>
    </div>
  );
}
