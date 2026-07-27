import { createClient } from "@/lib/supabase/server";
import { AlbumsGrid } from "./AlbumsGrid";

export default async function PortfolioPage() {
  const supabase = await createClient();
  const { data: albums, error } = await supabase
    .from("albums")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="text-sm text-red-600">
        Failed to load albums: {error.message}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Portfolio
        </h1>
      </div>
      <AlbumsGrid initialAlbums={albums ?? []} />
    </div>
  );
}
