"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import type { GalleryPhoto, PhotoSelection } from "@/lib/supabase/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

const PRINT_SIZES = ["4x6", "5x7", "8x10", "11x14"];

type SelectionState = {
  is_selected: boolean;
  quantity: number;
  print_size: string | null;
  client_note: string | null;
};

function toState(selection?: PhotoSelection): SelectionState {
  return {
    is_selected: selection?.is_selected ?? false,
    quantity: selection?.quantity ?? 1,
    print_size: selection?.print_size ?? null,
    client_note: selection?.client_note ?? null,
  };
}

export function GalleryView({
  token,
  photos,
  initialSelections,
  signedUrlByPath,
}: {
  token: string;
  photos: GalleryPhoto[];
  initialSelections: PhotoSelection[];
  signedUrlByPath: Record<string, string>;
}) {
  const initialMap = new Map<string, SelectionState>();
  for (const photo of photos) {
    const selection = initialSelections.find(
      (s) => s.gallery_photo_id === photo.id
    );
    initialMap.set(photo.id, toState(selection));
  }
  const [selections, setSelections] =
    useState<Map<string, SelectionState>>(initialMap);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function persist(photoId: string, next: SelectionState) {
    try {
      await fetch("/api/selections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          galleryPhotoId: photoId,
          ...next,
        }),
      });
    } catch (err) {
      console.error("Failed to save selection:", err);
    }
  }

  function updateSelection(photoId: string, patch: Partial<SelectionState>) {
    setSelections((prev) => {
      const next = new Map(prev);
      const current = next.get(photoId) ?? toState();
      const updated = { ...current, ...patch };
      next.set(photoId, updated);
      persist(photoId, updated);
      return next;
    });
  }

  function toggleSelected(photoId: string) {
    const current = selections.get(photoId) ?? toState();
    const nextSelected = !current.is_selected;
    updateSelection(photoId, { is_selected: nextSelected });
    setExpandedId(nextSelected ? photoId : null);
  }

  if (photos.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No photos have been uploaded to this gallery yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {photos.map((photo) => {
        const state = selections.get(photo.id) ?? toState();
        const url = signedUrlByPath[photo.storage_path];

        return (
          <div key={photo.id} className="space-y-2">
            <button
              type="button"
              onClick={() => toggleSelected(photo.id)}
              className={`relative block aspect-square w-full overflow-hidden rounded-lg border-2 ${
                state.is_selected
                  ? "border-zinc-900 dark:border-zinc-100"
                  : "border-transparent"
              }`}
            >
              {url && (
                <Image
                  src={url}
                  alt={photo.filename}
                  fill
                  sizes="(max-width: 640px) 50vw, 33vw"
                  className="object-cover"
                />
              )}
              {state.is_selected && (
                <span className="absolute right-2 top-2 rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
                  Selected
                </span>
              )}
            </button>

            {state.is_selected && expandedId === photo.id && (
              <SelectionDetails
                state={state}
                onChange={(patch) => updateSelection(photo.id, patch)}
                onDone={() => setExpandedId(null)}
              />
            )}

            {state.is_selected && expandedId !== photo.id && (
              <button
                type="button"
                className="text-xs text-zinc-500 underline underline-offset-2"
                onClick={() => setExpandedId(photo.id)}
              >
                Edit print details
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SelectionDetails({
  state,
  onChange,
  onDone,
}: {
  state: SelectionState;
  onChange: (patch: Partial<SelectionState>) => void;
  onDone: () => void;
}) {
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleNoteChange(value: string) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      onChange({ client_note: value });
    }, 500);
  }

  return (
    <div className="space-y-2 rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
      <div className="flex items-center gap-2">
        <label className="text-xs text-zinc-500">Qty</label>
        <Input
          type="number"
          min={1}
          value={state.quantity}
          onChange={(e) =>
            onChange({ quantity: Math.max(1, Number(e.target.value) || 1) })
          }
          className="w-16"
        />
        <select
          value={state.print_size ?? ""}
          onChange={(e) => onChange({ print_size: e.target.value || null })}
          className="flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">Print size</option>
          {PRINT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
      <Textarea
        ref={noteRef}
        rows={2}
        defaultValue={state.client_note ?? ""}
        placeholder="Note for the photographer (optional)"
        onChange={(e) => handleNoteChange(e.target.value)}
      />
      <Button size="sm" variant="secondary" onClick={onDone} type="button">
        Done
      </Button>
    </div>
  );
}
