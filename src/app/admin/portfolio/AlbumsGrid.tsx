"use client";

import { useState } from "react";
import Link from "next/link";
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
import type { Album } from "@/lib/supabase/types";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  createAlbum,
  deleteAlbum,
  reorderAlbums,
  updateAlbum,
} from "./actions";

export function AlbumsGrid({ initialAlbums }: { initialAlbums: Album[] }) {
  const [albums, setAlbums] = useState<Album[]>(initialAlbums);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = albums.findIndex((a) => a.id === active.id);
    const newIndex = albums.findIndex((a) => a.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(albums, oldIndex, newIndex);
    setAlbums(reordered);

    try {
      await reorderAlbums(
        reordered.map((album, index) => ({ id: album.id, sort_order: index }))
      );
    } catch (err) {
      console.error("Failed to reorder albums:", err);
    }
  }

  async function handleTogglePublish(album: Album) {
    setAlbums((prev) =>
      prev.map((a) =>
        a.id === album.id ? { ...a, is_published: !a.is_published } : a
      )
    );
    try {
      await updateAlbum(album.id, { is_published: !album.is_published });
    } catch (err) {
      console.error("Failed to update album:", err);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(null);
    setAlbums((prev) => prev.filter((a) => a.id !== id));
    try {
      await deleteAlbum(id);
    } catch (err) {
      console.error("Failed to delete album:", err);
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreating(true)}>New album</Button>
      </div>

      {albums.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No albums yet. Create one to start building your portfolio.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={albums.map((a) => a.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {albums.map((album) => (
                <SortableAlbumCard
                  key={album.id}
                  album={album}
                  onTogglePublish={() => handleTogglePublish(album)}
                  onDelete={() => setDeletingId(album.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {creating && (
        <CreateAlbumModal
          onClose={() => setCreating(false)}
          onCreated={(album) => setAlbums((prev) => [...prev, album])}
        />
      )}

      {deletingId && (
        <Modal open onClose={() => setDeletingId(null)} title="Delete album">
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            This permanently deletes the album and all of its photos. This
            can&apos;t be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => handleDelete(deletingId)}>
              Delete
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SortableAlbumCard({
  album,
  onTogglePublish,
  onDelete,
}: {
  album: Album;
  onTogglePublish: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: album.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="h-full">
        <CardBody>
          <div
            {...attributes}
            {...listeners}
            className="mb-2 flex cursor-grab items-center justify-between active:cursor-grabbing"
          >
            <h2 className="font-medium text-zinc-900 dark:text-zinc-100">
              {album.title}
            </h2>
            <Badge tone={album.is_published ? "green" : "zinc"}>
              {album.is_published ? "Published" : "Draft"}
            </Badge>
          </div>
          {album.description && (
            <p className="mb-3 line-clamp-2 text-sm text-zinc-500">
              {album.description}
            </p>
          )}
          <div className="flex items-center justify-between gap-2">
            <Link
              href={`/admin/portfolio/${album.id}`}
              className="text-sm font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
            >
              Manage photos
            </Link>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={onTogglePublish}>
                {album.is_published ? "Unpublish" : "Publish"}
              </Button>
              <Button size="sm" variant="danger" onClick={onDelete}>
                Delete
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function CreateAlbumModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (album: Album) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const album = await createAlbum({ title, description });
      onCreated(album);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create album");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="New album">
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Smith Wedding"
            autoFocus
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            Description
          </label>
          <Textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={saving || !title.trim()}>
            {saving ? "Creating..." : "Create album"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
