import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (
    !body ||
    typeof body.token !== "string" ||
    typeof body.galleryPhotoId !== "string" ||
    typeof body.is_selected !== "boolean"
  ) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { token, galleryPhotoId, is_selected, quantity, print_size, client_note } =
    body as {
      token: string;
      galleryPhotoId: string;
      is_selected: boolean;
      quantity?: number;
      print_size?: string | null;
      client_note?: string | null;
    };

  const admin = createAdminClient();

  const { data: gallery, error: galleryError } = await admin
    .from("galleries")
    .select("id, is_active, expires_at")
    .eq("access_token", token)
    .single();

  if (galleryError || !gallery) {
    return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
  }

  if (!gallery.is_active) {
    return NextResponse.json({ error: "Gallery is not active" }, { status: 403 });
  }

  if (gallery.expires_at && new Date(gallery.expires_at) < new Date()) {
    return NextResponse.json({ error: "Gallery has expired" }, { status: 403 });
  }

  const { data: photo, error: photoError } = await admin
    .from("gallery_photos")
    .select("id")
    .eq("id", galleryPhotoId)
    .eq("gallery_id", gallery.id)
    .single();

  if (photoError || !photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  const { error: updateError } = await admin
    .from("photo_selections")
    .update({
      is_selected,
      quantity: typeof quantity === "number" && quantity > 0 ? quantity : 1,
      print_size: print_size || null,
      client_note: client_note || null,
    })
    .eq("gallery_photo_id", galleryPhotoId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
