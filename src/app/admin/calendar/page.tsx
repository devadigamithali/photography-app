import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "./CalendarView";

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("*")
    .order("event_date", { ascending: true });

  if (error) {
    return (
      <div className="text-sm text-red-600">
        Failed to load bookings: {error.message}
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Calendar
      </h1>
      <CalendarView initialBookings={bookings ?? []} />
    </div>
  );
}
