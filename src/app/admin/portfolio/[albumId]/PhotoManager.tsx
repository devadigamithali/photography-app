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
import type { Album, PortfolioPhoto } from "@/lib/supabase/types";
import { Button } from "@/components/ui/Button";
import {
  addPortfolioPhoto,
  deletePortfolioPhoto,
  reorderPortfolioPhotos,
} from "../actions";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function PhotoManager({
  album,
  initialPhotos,
}: {
  album: Album;
  initialPhotos: PortfolioPhoto[];
}) {
  const [photos, setPhotos] = useState<PortfolioPhoto[]>(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
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
        const storagePath = `${album.id}/${nanoid()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("portfolio")
          .upload(storagePath, file, { cacheControl: "3600" });

        if (uploadError) throw new Error(uploadError.message);

        const photo = await addPortfolioPhoto({
          albumId: album.id,
          storagePath,
          filename: file.name,
          sortOrder: nextSortOrder,
        });
        nextSortOrder += 1;
        setPhotos((prev) => [...prev, photo]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(photo: PortfolioPhoto) {
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    try {
      await deletePortfolioPhoto(photo.id, album.id);
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
      await reorderPortfolioPhotos(
        reordered.map((photo, index) => ({ id: photo.id, sort_order: index })),
        album.id
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
        <p className="text-sm text-zinc-500">No photos in this album yet.</p>
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
  onDelete,
}: {
  photo: PortfolioPhoto;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const supabase = createClient();
  const {
    data: { publicUrl },
  } = supabase.storage.from("portfolio").getPublicUrl(photo.storage_path);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group relative aspect-square cursor-grab overflow-hidden rounded-lg border border-zinc-200 active:cursor-grabbing dark:border-zinc-800"
    >
      <Image
        src={publicUrl}
        alt={photo.filename}
        fill
        sizes="(max-width: 640px) 50vw, 25vw"
        className="object-cover"
      />
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
