"use client";

import { useState } from "react";
import Link from "next/link";
import type { Gallery } from "@/lib/supabase/types";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { createGallery, deleteGallery, updateGallery } from "./actions";

export function GalleriesList({
  initialGalleries,
}: {
  initialGalleries: Gallery[];
}) {
  const [galleries, setGalleries] = useState<Gallery[]>(initialGalleries);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleToggleActive(gallery: Gallery) {
    setGalleries((prev) =>
      prev.map((g) =>
        g.id === gallery.id ? { ...g, is_active: !g.is_active } : g
      )
    );
    try {
      await updateGallery(gallery.id, { is_active: !gallery.is_active });
    } catch (err) {
      console.error("Failed to update gallery:", err);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(null);
    setGalleries((prev) => prev.filter((g) => g.id !== id));
    try {
      await deleteGallery(id);
    } catch (err) {
      console.error("Failed to delete gallery:", err);
    }
  }

  function handleCopyLink(gallery: Gallery) {
    const url = `${window.location.origin}/gallery/${gallery.access_token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(gallery.id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreating(true)}>New gallery</Button>
      </div>

      {galleries.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No client galleries yet. Create one to share private photos with a
          client.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {galleries.map((gallery) => (
            <Card key={gallery.id} className="h-full">
              <CardBody>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="font-medium text-zinc-900 dark:text-zinc-100">
                    {gallery.title}
                  </h2>
                  <Badge tone={gallery.is_active ? "green" : "zinc"}>
                    {gallery.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="mb-1 text-sm text-zinc-500">
                  {gallery.client_name}
                </p>
                {gallery.client_email && (
                  <p className="mb-3 truncate text-xs text-zinc-400">
                    {gallery.client_email}
                  </p>
                )}
                {gallery.expires_at && (
                  <p className="mb-3 text-xs text-zinc-400">
                    Expires {new Date(gallery.expires_at).toLocaleDateString()}
                  </p>
                )}
                <div className="flex items-center justify-between gap-2">
                  <Link
                    href={`/admin/galleries/${gallery.id}`}
                    className="text-sm font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
                  >
                    Manage photos
                  </Link>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleCopyLink(gallery)}
                    >
                      {copiedId === gallery.id ? "Copied!" : "Copy link"}
                    </Button>
                  </div>
                </div>
                <div className="mt-2 flex justify-between gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleToggleActive(gallery)}
                  >
                    {gallery.is_active ? "Deactivate" : "Activate"}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setDeletingId(gallery.id)}
                  >
                    Delete
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {creating && (
        <CreateGalleryModal
          onClose={() => setCreating(false)}
          onCreated={(gallery) => setGalleries((prev) => [gallery, ...prev])}
        />
      )}

      {deletingId && (
        <Modal open onClose={() => setDeletingId(null)} title="Delete gallery">
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            This permanently deletes the gallery, its photos, and the
            client&apos;s selections. This can&apos;t be undone.
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

function CreateGalleryModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (gallery: Gallery) => void;
}) {
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [title, setTitle] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!clientName.trim() || !title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const gallery = await createGallery({
        client_name: clientName,
        client_email: clientEmail,
        title,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      onCreated(gallery);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create gallery");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="New gallery">
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Gallery title
          </label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Smith Wedding Proofs"
            autoFocus
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            Client name
          </label>
          <Input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Jane Smith"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            Client email (optional)
          </label>
          <Input
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            placeholder="jane@example.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            Expires (optional)
          </label>
          <Input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={saving || !clientName.trim() || !title.trim()}
          >
            {saving ? "Creating..." : "Create gallery"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
