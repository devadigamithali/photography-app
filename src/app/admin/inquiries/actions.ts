"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { InquiryStatus } from "@/lib/supabase/types";

export async function createInquiry(input: {
  name: string;
  email: string;
  phone?: string | null;
  event_type?: string | null;
  event_date?: string | null;
  message?: string | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inquiries")
    .insert({
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      event_type: input.event_type || null,
      event_date: input.event_date || null,
      message: input.message || null,
      status: "new",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/admin/inquiries");
  return data;
}

export async function moveInquiry(
  id: string,
  status: InquiryStatus,
  sortOrder: number
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("inquiries")
    .update({ status, sort_order: sortOrder })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/inquiries");
}

export async function reorderInquiries(
  updates: { id: string; sort_order: number }[]
) {
  const supabase = await createClient();
  await Promise.all(
    updates.map(({ id, sort_order }) =>
      supabase.from("inquiries").update({ sort_order }).eq("id", id)
    )
  );
  revalidatePath("/admin/inquiries");
}

export async function updateInquiryNotes(id: string, notes: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("inquiries")
    .update({ notes })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/inquiries");
}

export async function createBookingFromInquiry(input: {
  inquiryId: string;
  title: string;
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  notes?: string | null;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("bookings").insert({
    inquiry_id: input.inquiryId,
    title: input.title,
    event_date: input.event_date,
    start_time: input.start_time || null,
    end_time: input.end_time || null,
    location: input.location || null,
    notes: input.notes || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin/calendar");
}

export async function checkDateHasBooking(eventDate: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("id")
    .eq("event_date", eventDate)
    .limit(1);

  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}
