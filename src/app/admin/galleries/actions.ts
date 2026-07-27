"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/server";

export async function createGallery(input: {
  client_name: string;
  client_email?: string;
  title: string;
  expires_at?: string | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("galleries")
    .insert({
      client_name: input.client_name,
      client_email: input.client_email || null,
      title: input.title,
      access_token: nanoid(24),
      expires_at: input.expires_at || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/admin/galleries");
  return data;
}

export async function updateGallery(
  id: string,
  input: {
    client_name?: string;
    client_email?: string | null;
    title?: string;
    expires_at?: string | null;
    is_active?: boolean;
  }
) {
  const supabase = await createClient();
  const { error } = await supabase.from("galleries").update(input).eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/galleries");
  revalidatePath(`/admin/galleries/${id}`);
}

export async function deleteGallery(id: string) {
  const supabase = await createClient();

  const { data: photos } = await supabase
    .from("gallery_photos")
    .select("storage_path")
    .eq("gallery_id", id);

  if (photos && photos.length > 0) {
    await supabase.storage
      .from("galleries")
      .remove(photos.map((p) => p.storage_path));
  }

  const { error } = await supabase.from("galleries").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/galleries");
}

export async function addGalleryPhoto(input: {
  galleryId: string;
  storagePath: string;
  filename: string;
  sortOrder: number;
}) {
  const supabase = await createClient();
  const { data: photo, error } = await supabase
    .from("gallery_photos")
    .insert({
      gallery_id: input.galleryId,
      storage_path: input.storagePath,
      filename: input.filename,
      sort_order: input.sortOrder,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  await supabase.from("photo_selections").insert({
    gallery_photo_id: photo.id,
    gallery_id: input.galleryId,
  });

  revalidatePath(`/admin/galleries/${input.galleryId}`);
  return photo;
}

export async function deleteGalleryPhoto(id: string, galleryId: string) {
  const supabase = await createClient();

  const { data: photo } = await supabase
    .from("gallery_photos")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (photo) {
    await supabase.storage.from("galleries").remove([photo.storage_path]);
  }

  const { error } = await supabase.from("gallery_photos").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/galleries/${galleryId}`);
}

export async function reorderGalleryPhotos(
  updates: { id: string; sort_order: number }[],
  galleryId: string
) {
  const supabase = await createClient();
  await Promise.all(
    updates.map(({ id, sort_order }) =>
      supabase.from("gallery_photos").update({ sort_order }).eq("id", id)
    )
  );
  revalidatePath(`/admin/galleries/${galleryId}`);
}

export async function getSignedGalleryPhotoUrl(storagePath: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("galleries")
    .createSignedUrl(storagePath, 60 * 60);

  if (error) throw new Error(error.message);
  return data.signedUrl;
}
