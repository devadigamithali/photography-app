import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PhotoManager } from "./PhotoManager";

export default async function AlbumDetailPage({
  params,
}: {
  params: Promise<{ albumId: string }>;
}) {
  const { albumId } = await params;
  const supabase = await createClient();

  const { data: album, error: albumError } = await supabase
    .from("albums")
    .select("*")
    .eq("id", albumId)
    .single();

  if (albumError || !album) {
    notFound();
  }

  const { data: photos, error: photosError } = await supabase
    .from("portfolio_photos")
    .select("*")
    .eq("album_id", albumId)
    .order("sort_order", { ascending: true });

  if (photosError) {
    return (
      <div className="text-sm text-red-600">
        Failed to load photos: {photosError.message}
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/admin/portfolio"
        className="mb-4 inline-block text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        &larr; Back to albums
      </Link>
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        {album.title}
      </h1>
      {album.description && (
        <p className="mb-6 text-sm text-zinc-500">{album.description}</p>
      )}
      <PhotoManager album={album} initialPhotos={photos ?? []} />
    </div>
  );
}
