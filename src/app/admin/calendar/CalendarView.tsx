"use client";

import { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateClickArg } from "@fullcalendar/interaction";
import type { EventClickArg } from "@fullcalendar/core";
import type { Booking } from "@/lib/supabase/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { createBooking, deleteBooking, updateBooking } from "./actions";

function toEvent(booking: Booking) {
  const allDay = !booking.start_time;
  return {
    id: booking.id,
    title: booking.title,
    start: allDay
      ? booking.event_date
      : `${booking.event_date}T${booking.start_time}`,
    end:
      !allDay && booking.end_time
        ? `${booking.event_date}T${booking.end_time}`
        : undefined,
    allDay,
  };
}

export function CalendarView({
  initialBookings,
}: {
  initialBookings: Booking[];
}) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [createDate, setCreateDate] = useState<string | null>(null);
  const [editing, setEditing] = useState<Booking | null>(null);

  function handleDateClick(arg: DateClickArg) {
    setCreateDate(arg.dateStr);
  }

  function handleEventClick(arg: EventClickArg) {
    const booking = bookings.find((b) => b.id === arg.event.id);
    if (booking) setEditing(booking);
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={bookings.map(toEvent)}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        height="auto"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "",
        }}
      />

      {createDate && (
        <BookingModal
          mode="create"
          defaultDate={createDate}
          onClose={() => setCreateDate(null)}
          onCreated={(booking) => setBookings((prev) => [...prev, booking])}
        />
      )}

      {editing && (
        <BookingModal
          mode="edit"
          booking={editing}
          onClose={() => setEditing(null)}
          onUpdated={(booking) =>
            setBookings((prev) =>
              prev.map((b) => (b.id === booking.id ? booking : b))
            )
          }
          onDeleted={(id) =>
            setBookings((prev) => prev.filter((b) => b.id !== id))
          }
        />
      )}
    </div>
  );
}

function BookingModal(
  props:
    | {
        mode: "create";
        defaultDate: string;
        onClose: () => void;
        onCreated: (booking: Booking) => void;
      }
    | {
        mode: "edit";
        booking: Booking;
        onClose: () => void;
        onUpdated: (booking: Booking) => void;
        onDeleted: (id: string) => void;
      }
) {
  const existing = props.mode === "edit" ? props.booking : null;
  const [title, setTitle] = useState(existing?.title ?? "");
  const [eventDate, setEventDate] = useState(
    existing?.event_date ?? (props.mode === "create" ? props.defaultDate : "")
  );
  const [startTime, setStartTime] = useState(existing?.start_time ?? "");
  const [endTime, setEndTime] = useState(existing?.end_time ?? "");
  const [location, setLocation] = useState(existing?.location ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!title.trim() || !eventDate) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title,
        event_date: eventDate,
        start_time: startTime || null,
        end_time: endTime || null,
        location: location || null,
        notes: notes || null,
      };
      if (props.mode === "create") {
        const booking = await createBooking(payload);
        props.onCreated(booking);
      } else {
        await updateBooking(props.booking.id, payload);
        props.onUpdated({ ...props.booking, ...payload });
      }
      props.onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save booking");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (props.mode !== "edit") return;
    setSaving(true);
    try {
      await deleteBooking(props.booking.id);
      props.onDeleted(props.booking.id);
      props.onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete booking");
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={props.onClose}
      title={props.mode === "create" ? "New booking" : "Edit booking"}
    >
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
          <label className="mb-1 block text-sm font-medium">Date</label>
          <Input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Start time
            </label>
            <Input
              type="time"
              value={startTime ?? ""}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              End time
            </label>
            <Input
              type="time"
              value={endTime ?? ""}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Location</label>
          <Input value={location ?? ""} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Notes</label>
          <Textarea
            rows={3}
            value={notes ?? ""}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-between gap-2">
          {props.mode === "edit" ? (
            <Button variant="danger" onClick={handleDelete} disabled={saving}>
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={props.onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !title.trim() || !eventDate}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
