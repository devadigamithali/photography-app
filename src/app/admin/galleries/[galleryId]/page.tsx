import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GalleryManager } from "./GalleryManager";

export default async function GalleryDetailPage({
  params,
}: {
  params: Promise<{ galleryId: string }>;
}) {
  const { galleryId } = await params;
  const supabase = await createClient();

  const { data: gallery, error: galleryError } = await supabase
    .from("galleries")
    .select("*")
    .eq("id", galleryId)
    .single();

  if (galleryError || !gallery) {
    notFound();
  }

  const { data: photos, error: photosError } = await supabase
    .from("gallery_photos")
    .select("*")
    .eq("gallery_id", galleryId)
    .order("sort_order", { ascending: true });

  if (photosError) {
    return (
      <div className="text-sm text-red-600">
        Failed to load photos: {photosError.message}
      </div>
    );
  }

  const { data: selections } = await supabase
    .from("photo_selections")
    .select("*")
    .eq("gallery_id", galleryId);

  const signedUrlByPath = new Map<string, string>();
  if (photos && photos.length > 0) {
    const { data: signedUrls } = await supabase.storage
      .from("galleries")
      .createSignedUrls(
        photos.map((p) => p.storage_path),
        60 * 60
      );
    for (const entry of signedUrls ?? []) {
      if (entry.signedUrl) signedUrlByPath.set(entry.path ?? "", entry.signedUrl);
    }
  }

  return (
    <div>
      <Link
        href="/admin/galleries"
        className="mb-4 inline-block text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        &larr; Back to galleries
      </Link>
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        {gallery.title}
      </h1>
      <p className="mb-6 text-sm text-zinc-500">
        {gallery.client_name}
        {gallery.client_email ? ` · ${gallery.client_email}` : ""}
      </p>
      <GalleryManager
        gallery={gallery}
        initialPhotos={photos ?? []}
        initialSelections={selections ?? []}
        signedUrlByPath={Object.fromEntries(signedUrlByPath)}
      />

      <SelectionsSummary
        photos={photos ?? []}
        selections={selections ?? []}
      />
    </div>
  );
}

function SelectionsSummary({
  photos,
  selections,
}: {
  photos: { id: string; filename: string }[];
  selections: {
    gallery_photo_id: string;
    is_selected: boolean;
    quantity: number;
    print_size: string | null;
    client_note: string | null;
  }[];
}) {
  const photoById = new Map(photos.map((p) => [p.id, p]));
  const selected = selections.filter((s) => s.is_selected);

  if (selected.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Client selections ({selected.length})
      </h2>
      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-2 font-medium">Photo</th>
              <th className="px-3 py-2 font-medium">Qty</th>
              <th className="px-3 py-2 font-medium">Print size</th>
              <th className="px-3 py-2 font-medium">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {selected.map((s) => (
              <tr key={s.gallery_photo_id}>
                <td className="px-3 py-2 text-zinc-900 dark:text-zinc-100">
                  {photoById.get(s.gallery_photo_id)?.filename ?? "—"}
                </td>
                <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                  {s.quantity}
                </td>
                <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                  {s.print_size ?? "—"}
                </td>
                <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                  {s.client_note ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
