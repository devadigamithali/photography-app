"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

/**
 * Browser-side Supabase client (anon key only). Safe to import from
 * Client Components. Never import the service-role client here.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars."
    );
  }

  if (url.includes("placeholder.supabase.co") || anonKey.includes("placeholder-anon-key")) {
    throw new Error(
      "Supabase env vars are still placeholders. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your real Supabase project values."
    );
  }

  return createBrowserClient<Database>(url, anonKey);
}
