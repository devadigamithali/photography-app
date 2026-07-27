"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createBooking(input: {
  title: string;
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
  location?: string | null;
  notes?: string | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      title: input.title,
      event_date: input.event_date,
      start_time: input.start_time || null,
      end_time: input.end_time || null,
      location: input.location || null,
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/admin/calendar");
  return data;
}

export async function updateBooking(
  id: string,
  input: {
    title?: string;
    event_date?: string;
    start_time?: string | null;
    end_time?: string | null;
    location?: string | null;
    notes?: string | null;
  }
) {
  const supabase = await createClient();
  const { error } = await supabase.from("bookings").update(input).eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/calendar");
}

export async function deleteBooking(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("bookings").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/calendar");
}
