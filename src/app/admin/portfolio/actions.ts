"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "album"
  );
}

export async function createAlbum(input: { title: string; description?: string }) {
  const supabase = await createClient();

  const baseSlug = slugify(input.title);
  let slug = baseSlug;
  for (let attempt = 1; attempt < 20; attempt++) {
    const { data: existing } = await supabase
      .from("albums")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!existing) break;
    slug = `${baseSlug}-${attempt + 1}`;
  }

  const { data, error } = await supabase
    .from("albums")
    .insert({
      title: input.title,
      slug,
      description: input.description || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/admin/portfolio");
  return data;
}

export async function updateAlbum(
  id: string,
  input: { title?: string; description?: string | null; is_published?: boolean }
) {
  const supabase = await createClient();
  const { error } = await supabase.from("albums").update(input).eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/portfolio");
  revalidatePath(`/admin/portfolio/${id}`);
}

export async function deleteAlbum(id: string) {
  const supabase = await createClient();

  const { data: photos } = await supabase
    .from("portfolio_photos")
    .select("storage_path")
    .eq("album_id", id);

  if (photos && photos.length > 0) {
    await supabase.storage
      .from("portfolio")
      .remove(photos.map((p) => p.storage_path));
  }

  const { error } = await supabase.from("albums").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/portfolio");
}

export async function reorderAlbums(updates: { id: string; sort_order: number }[]) {
  const supabase = await createClient();
  await Promise.all(
    updates.map(({ id, sort_order }) =>
      supabase.from("albums").update({ sort_order }).eq("id", id)
    )
  );
  revalidatePath("/admin/portfolio");
}

export async function addPortfolioPhoto(input: {
  albumId: string;
  storagePath: string;
  filename: string;
  sortOrder: number;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("portfolio_photos")
    .insert({
      album_id: input.albumId,
      storage_path: input.storagePath,
      filename: input.filename,
      sort_order: input.sortOrder,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/portfolio/${input.albumId}`);
  return data;
}

export async function deletePortfolioPhoto(id: string, albumId: string) {
  const supabase = await createClient();

  const { data: photo } = await supabase
    .from("portfolio_photos")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (photo) {
    await supabase.storage.from("portfolio").remove([photo.storage_path]);
  }

  const { error } = await supabase.from("portfolio_photos").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/portfolio/${albumId}`);
}

export async function reorderPortfolioPhotos(
  updates: { id: string; sort_order: number }[],
  albumId: string
) {
  const supabase = await createClient();
  await Promise.all(
    updates.map(({ id, sort_order }) =>
      supabase.from("portfolio_photos").update({ sort_order }).eq("id", id)
    )
  );
  revalidatePath(`/admin/portfolio/${albumId}`);
}
