import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import type { PortfolioPhoto } from "@/lib/supabase/types";
import { ContactForm } from "../contact/ContactForm";

export default async function BrowsePage() {
  const supabase = await createClient();
  const { data: albums } = await supabase
    .from("albums")
    .select("*")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  const albumIds = (albums ?? []).map((a) => a.id);
  const { data: coverPhotos } = albumIds.length
    ? await supabase
        .from("portfolio_photos")
        .select("*")
        .in("album_id", albumIds)
        .order("sort_order", { ascending: true })
    : { data: [] };

  const coverByAlbumId = new Map<string, PortfolioPhoto>();
  for (const photo of coverPhotos ?? []) {
    if (!coverByAlbumId.has(photo.album_id)) {
      coverByAlbumId.set(photo.album_id, photo);
    }
  }

  return (
    <div>
      <section className="mx-auto max-w-5xl px-4 py-16 text-center sm:py-20">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
          Photography that feels like the moment
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-zinc-600 dark:text-zinc-400">
          Weddings, portraits, and events, captured with care. Browse recent
          work below, or scroll down to send an inquiry.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-20">
        {!albums || albums.length === 0 ? (
          <p className="text-center text-sm text-zinc-500">
            No published albums yet — check back soon.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((album) => {
              const cover = coverByAlbumId.get(album.id);
              const coverUrl = cover
                ? supabase.storage
                    .from("portfolio")
                    .getPublicUrl(cover.storage_path).data.publicUrl
                : null;

              return (
                <Link
                  key={album.id}
                  href={`/portfolio/${album.slug}`}
                  className="group block"
                >
                  <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-900">
                    {coverUrl && (
                      <Image
                        src={coverUrl}
                        alt={album.title}
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <p className="mt-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {album.title}
                  </p>
                  {album.description && (
                    <p className="line-clamp-1 text-xs text-zinc-500">
                      {album.description}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section
        id="contact"
        className="border-t border-zinc-200 bg-zinc-50 px-4 py-16 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="mx-auto max-w-lg">
          <h2 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Get in touch
          </h2>
          <p className="mb-8 text-sm text-zinc-500">
            Tell us about your event and we&apos;ll get back to you shortly.
          </p>
          <ContactForm />
        </div>
      </section>
    </div>
  );
}
