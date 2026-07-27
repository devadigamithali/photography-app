import { createClient } from "@/lib/supabase/server";
import { GalleriesList } from "./GalleriesList";

export default async function GalleriesPage() {
  const supabase = await createClient();
  const { data: galleries, error } = await supabase
    .from("galleries")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="text-sm text-red-600">
        Failed to load galleries: {error.message}
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        Galleries
      </h1>
      <GalleriesList initialGalleries={galleries ?? []} />
    </div>
  );
}
