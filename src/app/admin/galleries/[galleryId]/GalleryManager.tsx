"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { nanoid } from "nanoid";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@/lib/supabase/client";
import type { Gallery, GalleryPhoto, PhotoSelection } from "@/lib/supabase/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  addGalleryPhoto,
  deleteGalleryPhoto,
  getSignedGalleryPhotoUrl,
  reorderGalleryPhotos,
} from "../actions";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function GalleryManager({
  gallery,
  initialPhotos,
  initialSelections,
  signedUrlByPath,
}: {
  gallery: Gallery;
  initialPhotos: GalleryPhoto[];
  initialSelections: PhotoSelection[];
  signedUrlByPath: Record<string, string>;
}) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>(initialPhotos);
  const [urls, setUrls] = useState<Record<string, string>>(signedUrlByPath);
  const [selections] = useState<PhotoSelection[]>(initialSelections);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const selectionByPhotoId = new Map(
    selections.map((s) => [s.gallery_photo_id, s])
  );

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).filter((f) =>
      ACCEPTED_TYPES.includes(f.type)
    );
    if (files.length === 0) {
      setError("Only JPEG, PNG, and WebP images are supported.");
      return;
    }

    setError(null);
    setUploading(true);
    const supabase = createClient();

    try {
      let nextSortOrder = photos.length;
      for (const file of files) {
        const ext = file.name.split(".").pop() || "jpg";
        const storagePath = `${gallery.id}/${nanoid()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("galleries")
          .upload(storagePath, file, { cacheControl: "3600" });

        if (uploadError) throw new Error(uploadError.message);

        const photo = await addGalleryPhoto({
          galleryId: gallery.id,
          storagePath,
          filename: file.name,
          sortOrder: nextSortOrder,
        });
        nextSortOrder += 1;

        const signedUrl = await getSignedGalleryPhotoUrl(storagePath);
        setUrls((prev) => ({ ...prev, [storagePath]: signedUrl }));
        setPhotos((prev) => [...prev, photo]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(photo: GalleryPhoto) {
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    try {
      await deleteGalleryPhoto(photo.id, gallery.id);
    } catch (err) {
      console.error("Failed to delete photo:", err);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = photos.findIndex((p) => p.id === active.id);
    const newIndex = photos.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(photos, oldIndex, newIndex);
    setPhotos(reordered);

    try {
      await reorderGalleryPhotos(
        reordered.map((photo, index) => ({ id: photo.id, sort_order: index })),
        gallery.id
      );
    } catch (err) {
      console.error("Failed to reorder photos:", err);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={(e) => handleFilesSelected(e.target.files)}
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Upload photos"}
        </Button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {photos.length === 0 ? (
        <p className="text-sm text-zinc-500">No photos in this gallery yet.</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={photos.map((p) => p.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((photo) => (
                <SortablePhoto
                  key={photo.id}
                  photo={photo}
                  url={urls[photo.storage_path]}
                  selection={selectionByPhotoId.get(photo.id)}
                  onDelete={() => handleDelete(photo)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SortablePhoto({
  photo,
  url,
  selection,
  onDelete,
}: {
  photo: GalleryPhoto;
  url?: string;
  selection?: PhotoSelection;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative aspect-square overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800"
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
      >
        {url && (
          <Image
            src={url}
            alt={photo.filename}
            fill
            sizes="(max-width: 640px) 50vw, 25vw"
            className="object-cover"
          />
        )}
      </div>
      {selection?.is_selected && (
        <Badge tone="green" className="absolute left-1.5 top-1.5">
          Selected
          {selection.quantity > 1 ? ` ×${selection.quantity}` : ""}
        </Badge>
      )}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onDelete}
        className="absolute right-1.5 top-1.5 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100"
      >
        Delete
      </button>
    </div>
  );
}
