"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import type { Inquiry, InquiryStatus } from "@/lib/supabase/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  moveInquiry,
  reorderInquiries,
  updateInquiryNotes,
  createBookingFromInquiry,
  checkDateHasBooking,
} from "./actions";

const COLUMNS: { status: InquiryStatus; label: string }[] = [
  { status: "new", label: "New" },
  { status: "contacted", label: "Contacted" },
  { status: "booked", label: "Booked" },
  { status: "completed", label: "Completed" },
  { status: "archived", label: "Archived" },
];

type ColumnMap = Record<InquiryStatus, Inquiry[]>;

function groupByStatus(inquiries: Inquiry[]): ColumnMap {
  const map: ColumnMap = {
    new: [],
    contacted: [],
    booked: [],
    completed: [],
    archived: [],
  };
  for (const inquiry of inquiries) {
    map[inquiry.status]?.push(inquiry);
  }
  return map;
}

export function KanbanBoard({
  initialInquiries,
}: {
  initialInquiries: Inquiry[];
}) {
  const [columns, setColumns] = useState<ColumnMap>(() =>
    groupByStatus(initialInquiries)
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [bookingModal, setBookingModal] = useState<Inquiry | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const findContainer = useCallback(
    (id: string): InquiryStatus | undefined => {
      if (id in columns) return id as InquiryStatus;
      return (Object.keys(columns) as InquiryStatus[]).find((status) =>
        columns[status].some((item) => item.id === id)
      );
    },
    [columns]
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragOver(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeContainer = findContainer(String(active.id));
    const overContainer = findContainer(String(over.id));
    if (!activeContainer || !overContainer || activeContainer === overContainer)
      return;

    setColumns((prev) => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];
      const activeIndex = activeItems.findIndex((i) => i.id === active.id);
      if (activeIndex === -1) return prev;
      const [moved] = activeItems.slice(activeIndex, activeIndex + 1);
      const newActiveItems = activeItems.filter((i) => i.id !== active.id);
      const overIndex = overItems.findIndex((i) => i.id === over.id);
      const insertAt = overIndex >= 0 ? overIndex : overItems.length;
      const newOverItems = [
        ...overItems.slice(0, insertAt),
        { ...moved, status: overContainer },
        ...overItems.slice(insertAt),
      ];
      return {
        ...prev,
        [activeContainer]: newActiveItems,
        [overContainer]: newOverItems,
      };
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeContainer = findContainer(String(active.id));
    const overContainer = findContainer(String(over.id));
    if (!activeContainer || !overContainer) return;

    let finalColumns = columns;

    if (activeContainer === overContainer) {
      const items = columns[activeContainer];
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex !== newIndex && newIndex !== -1) {
        const reordered = arrayMove(items, oldIndex, newIndex);
        finalColumns = { ...columns, [activeContainer]: reordered };
        setColumns(finalColumns);
      }
    }

    // Persist sort_order for the destination column (and status if changed).
    const destItems = finalColumns[overContainer];
    const updates = destItems.map((item, index) => ({
      id: item.id,
      sort_order: index,
    }));

    try {
      const movedItem = destItems.find((i) => i.id === active.id);
      if (movedItem) {
        const destIndex = destItems.findIndex((i) => i.id === active.id);
        await moveInquiry(String(active.id), overContainer, destIndex);

        if (overContainer === "booked" && activeContainer !== "booked") {
          setBookingModal({ ...movedItem, status: overContainer });
        }
      }
      if (activeContainer !== overContainer) {
        const sourceItems = finalColumns[activeContainer];
        await reorderInquiries(
          sourceItems.map((item, index) => ({ id: item.id, sort_order: index }))
        );
      }
      await reorderInquiries(
        updates.filter((u) => u.id !== String(active.id))
      );
    } catch (err) {
      console.error("Failed to persist kanban move:", err);
    }
  }

  const activeItem = useMemo(() => {
    if (!activeId) return null;
    for (const status of Object.keys(columns) as InquiryStatus[]) {
      const found = columns[status].find((i) => i.id === activeId);
      if (found) return found;
    }
    return null;
  }, [activeId, columns]);

  function handleNotesSaved(id: string, notes: string) {
    setColumns((prev) => {
      const next: ColumnMap = { ...prev };
      for (const status of Object.keys(next) as InquiryStatus[]) {
        next[status] = next[status].map((item) =>
          item.id === id ? { ...item, notes } : item
        );
      }
      return next;
    });
  }

  return (
    <div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {COLUMNS.map((col) => (
            <Column
              key={col.status}
              status={col.status}
              label={col.label}
              items={columns[col.status]}
              onCardClick={setSelected}
            />
          ))}
        </div>
        <DragOverlay>
          {activeItem ? <InquiryCardView inquiry={activeItem} /> : null}
        </DragOverlay>
      </DndContext>

      {selected && (
        <DetailPanel
          inquiry={selected}
          onClose={() => setSelected(null)}
          onNotesSaved={handleNotesSaved}
        />
      )}

      {bookingModal && (
        <BookingModal
          inquiry={bookingModal}
          onClose={() => setBookingModal(null)}
        />
      )}
    </div>
  );
}

function Column({
  status,
  label,
  items,
  onCardClick,
}: {
  status: InquiryStatus;
  label: string;
  items: Inquiry[];
  onCardClick: (inquiry: Inquiry) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[300px] flex-col gap-2 rounded-lg border p-2 ${
        isOver
          ? "border-zinc-400 bg-zinc-100 dark:bg-zinc-800"
          : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
      }`}
    >
      <div className="mb-1 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {label}
        </h2>
        <span className="text-xs text-zinc-400">{items.length}</span>
      </div>
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        {items.map((item) => (
          <SortableCard key={item.id} inquiry={item} onClick={onCardClick} />
        ))}
      </SortableContext>
    </div>
  );
}

function SortableCard({
  inquiry,
  onClick,
}: {
  inquiry: Inquiry;
  onClick: (inquiry: Inquiry) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: inquiry.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(inquiry)}
    >
      <InquiryCardView inquiry={inquiry} />
    </div>
  );
}

function InquiryCardView({ inquiry }: { inquiry: Inquiry }) {
  return (
    <Card className="cursor-pointer p-3 hover:shadow-md">
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {inquiry.name}
      </p>
      <p className="truncate text-xs text-zinc-500">{inquiry.email}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        {inquiry.event_type && <Badge tone="blue">{inquiry.event_type}</Badge>}
        {inquiry.event_date && (
          <Badge tone="zinc">{inquiry.event_date}</Badge>
        )}
      </div>
    </Card>
  );
}

function DetailPanel({
  inquiry,
  onClose,
  onNotesSaved,
}: {
  inquiry: Inquiry;
  onClose: () => void;
  onNotesSaved: (id: string, notes: string) => void;
}) {
  const [notes, setNotes] = useState(inquiry.notes ?? "");
  const [saving, setSaving] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(value: string) {
    setNotes(value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await updateInquiryNotes(inquiry.id, value);
        onNotesSaved(inquiry.id, value);
      } catch (err) {
        console.error("Failed to save notes:", err);
      } finally {
        setSaving(false);
      }
    }, 600);
  }

  return (
    <Modal open onClose={onClose} title={inquiry.name} widthClassName="max-w-lg">
      <div className="space-y-3 text-sm">
        <p>
          <span className="font-medium">Email:</span> {inquiry.email}
        </p>
        {inquiry.phone && (
          <p>
            <span className="font-medium">Phone:</span> {inquiry.phone}
          </p>
        )}
        {inquiry.event_type && (
          <p>
            <span className="font-medium">Event type:</span> {inquiry.event_type}
          </p>
        )}
        {inquiry.event_date && (
          <p>
            <span className="font-medium">Event date:</span> {inquiry.event_date}
          </p>
        )}
        {inquiry.message && (
          <div>
            <p className="font-medium">Message:</p>
            <p className="whitespace-pre-wrap text-zinc-600 dark:text-zinc-400">
              {inquiry.message}
            </p>
          </div>
        )}
        <div>
          <label className="mb-1 flex items-center justify-between text-sm font-medium">
            Notes
            {saving && <span className="text-xs text-zinc-400">Saving...</span>}
          </label>
          <Textarea
            rows={4}
            value={notes}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Internal notes..."
          />
        </div>
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function BookingModal({
  inquiry,
  onClose,
}: {
  inquiry: Inquiry;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(`${inquiry.event_type ?? "Shoot"} — ${inquiry.name}`);
  const [eventDate, setEventDate] = useState(inquiry.event_date ?? "");
  const [location, setLocation] = useState("");
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleDateChange(value: string) {
    setEventDate(value);
    if (!value) {
      setConflictWarning(null);
      return;
    }
    try {
      const hasBooking = await checkDateHasBooking(value);
      setConflictWarning(
        hasBooking ? "Heads up: there's already a booking on this date." : null
      );
    } catch {
      setConflictWarning(null);
    }
  }

  async function handleConfirm() {
    if (!eventDate) return;
    setSaving(true);
    try {
      await createBookingFromInquiry({
        inquiryId: inquiry.id,
        title,
        event_date: eventDate,
        location,
      });
      onClose();
    } catch (err) {
      console.error("Failed to create booking:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Confirm booking">
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Event date</label>
          <Input
            type="date"
            value={eventDate}
            onChange={(e) => handleDateChange(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Location</label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        {conflictWarning && (
          <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            {conflictWarning}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Skip
          </Button>
          <Button onClick={handleConfirm} disabled={saving || !eventDate}>
            {saving ? "Saving..." : "Create booking"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
