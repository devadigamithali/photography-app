"use server";

import { createClient } from "@/lib/supabase/server";
import { sendInquiryNotification } from "@/lib/email/resend";
import { inquirySchema, type InquiryFormValues } from "./schema";

export type SubmitInquiryResult =
  | { ok: true }
  | { ok: false; error: string };

export async function submitInquiry(
  values: InquiryFormValues
): Promise<SubmitInquiryResult> {
  const parsed = inquirySchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: "Please check the form for errors." };
  }

  const { name, email, phone, event_type, event_date, message } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inquiries")
    .insert({
      name,
      email,
      phone: phone || null,
      event_type: event_type || null,
      event_date: event_date || null,
      message: message || null,
      status: "new",
    })
    .select()
    .single();

  if (error || !data) {
    console.error("Failed to insert inquiry:", error);
    return { ok: false, error: "Something went wrong submitting your inquiry." };
  }

  // Email failure should never block the client's submission.
  try {
    await sendInquiryNotification(data);
  } catch (err) {
    console.error("Failed to send inquiry notification email:", err);
  }

  return { ok: true };
}
