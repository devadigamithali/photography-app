import { createClient } from "@/lib/supabase/server";
import { KanbanBoard } from "./KanbanBoard";

export default async function InquiriesPage() {
  const supabase = await createClient();
  const { data: inquiries, error } = await supabase
    .from("inquiries")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="text-sm text-red-600">
        Failed to load inquiries: {error.message}
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Inquiries
      </h1>
      <KanbanBoard initialInquiries={inquiries ?? []} />
    </div>
  );
}
