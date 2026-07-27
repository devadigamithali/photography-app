import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: album } = await supabase
    .from("albums")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!album) {
    notFound();
  }

  const { data: photos } = await supabase
    .from("portfolio_photos")
    .select("*")
    .eq("album_id", album.id)
    .order("sort_order", { ascending: true });

  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <Link
        href="/browse"
        className="mb-4 inline-block text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        &larr; Back to portfolio
      </Link>
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        {album.title}
      </h1>
      {album.description && (
        <p className="mb-8 text-sm text-zinc-500">{album.description}</p>
      )}

      {!photos || photos.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No photos in this album yet.
        </p>
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
          {photos.map((photo) => {
            const { publicUrl } = supabase.storage
              .from("portfolio")
              .getPublicUrl(photo.storage_path).data;

            return (
              <div
                key={photo.id}
                className="relative overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900"
              >
                <Image
                  src={publicUrl}
                  alt={photo.filename}
                  width={800}
                  height={800}
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="h-auto w-full object-cover"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
