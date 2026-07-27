import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { GalleryView } from "./GalleryView";

export default async function ClientGalleryPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: gallery } = await admin
    .from("galleries")
    .select("*")
    .eq("access_token", token)
    .single();

  if (!gallery || !gallery.is_active) {
    notFound();
  }

  if (gallery.expires_at && new Date(gallery.expires_at) < new Date()) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          This gallery has expired
        </h1>
        <p className="text-sm text-zinc-500">
          Please reach out to your photographer for a new link.
        </p>
      </div>
    );
  }

  const { data: photos } = await admin
    .from("gallery_photos")
    .select("*")
    .eq("gallery_id", gallery.id)
    .order("sort_order", { ascending: true });

  const { data: selections } = await admin
    .from("photo_selections")
    .select("*")
    .eq("gallery_id", gallery.id);

  const signedUrlByPath = new Map<string, string>();
  if (photos && photos.length > 0) {
    const { data: signedUrls } = await admin.storage
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
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
        {gallery.title}
      </h1>
      <p className="mb-8 text-sm text-zinc-500">
        Hi {gallery.client_name}, tap a photo to select it for printing.
      </p>
      <GalleryView
        token={token}
        photos={photos ?? []}
        initialSelections={selections ?? []}
        signedUrlByPath={Object.fromEntries(signedUrlByPath)}
      />
    </div>
  );
}
