import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Inquiry } from "@/lib/supabase/types";

/**
 * Sends the photographer a plain HTML/text email whenever a new inquiry
 * comes in. Looks up the notification address from `profiles` via the
 * service-role client. Callers should wrap this in try/catch — a failed
 * send must never block the client's form submission.
 */
export async function sendInquiryNotification(inquiry: Inquiry) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    throw new Error(
      "Missing RESEND_API_KEY or RESEND_FROM_EMAIL env vars; skipping email send."
    );
  }

  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("notification_email")
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!profile?.notification_email) {
    throw new Error(
      "No profiles.notification_email configured; cannot notify photographer."
    );
  }

  const resend = new Resend(apiKey);

  const subject = `New inquiry from ${inquiry.name}`;
  const lines = [
    `Name: ${inquiry.name}`,
    `Email: ${inquiry.email}`,
    inquiry.phone ? `Phone: ${inquiry.phone}` : null,
    inquiry.event_type ? `Event type: ${inquiry.event_type}` : null,
    inquiry.event_date ? `Event date: ${inquiry.event_date}` : null,
    "",
    "Message:",
    inquiry.message ?? "(no message)",
  ].filter((line): line is string => line !== null);

  const text = lines.join("\n");
  const html = `<div style="font-family: sans-serif; font-size: 14px; color: #111;">
    <h2>New inquiry from ${escapeHtml(inquiry.name)}</h2>
    <p><strong>Email:</strong> ${escapeHtml(inquiry.email)}</p>
    ${inquiry.phone ? `<p><strong>Phone:</strong> ${escapeHtml(inquiry.phone)}</p>` : ""}
    ${inquiry.event_type ? `<p><strong>Event type:</strong> ${escapeHtml(inquiry.event_type)}</p>` : ""}
    ${inquiry.event_date ? `<p><strong>Event date:</strong> ${escapeHtml(inquiry.event_date)}</p>` : ""}
    <p><strong>Message:</strong></p>
    <p style="white-space: pre-wrap;">${escapeHtml(inquiry.message ?? "(no message)")}</p>
  </div>`;

  await resend.emails.send({
    from: fromEmail,
    to: profile.notification_email,
    subject,
    html,
    text,
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
