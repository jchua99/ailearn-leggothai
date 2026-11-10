"use client";

import Link from "next/link";
import { useState } from "react";
import { deleteItemAction, saveItemAction } from "@/app/actions";
import { CATEGORY_ICONS, ITINERARY_CATEGORIES } from "@/lib/constants";
import { dangerButton, Field, FormMessage, inputClass, optionFocusRing, primaryButton, secondaryButton } from "@/components/ui";
import { useFormAction } from "@/components/useFormAction";
import type { MiniUser } from "@/lib/users";

export type ItemFormValues = {
  id?: number;
  date: string;
  startTime: string | null;
  endTime: string | null;
  title: string;
  category: string;
  location: string | null;
  mapUrl: string | null;
  notes: string | null;
  forEveryone: boolean;
  attendeeIds: number[];
};

export function ItemForm({
  initial,
  users,
  currentUserId,
}: {
  initial: ItemFormValues;
  users: MiniUser[];
  currentUserId: number;
}) {
  const { state, onSubmit, pending } = useFormAction(saveItemAction);
  const [audience, setAudience] = useState<"everyone" | "some">(initial.forEveryone ? "everyone" : "some");
  const defaultAttendees = initial.attendeeIds.length ? initial.attendeeIds : [currentUserId];

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        {initial.id && <input type="hidden" name="id" value={initial.id} />}
        <Field label="What">
          <input name="title" required maxLength={100} defaultValue={initial.title} placeholder="Dinner at Jay Fai" className={inputClass} />
        </Field>

        <Field label="Category">
          <select name="category" defaultValue={initial.category} className={inputClass}>
            {ITINERARY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_ICONS[c]} {c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Date">
          <input type="date" name="date" required defaultValue={initial.date} className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start time" hint="Leave empty for all day">
            <input type="time" name="startTime" defaultValue={initial.startTime ?? ""} className={inputClass} />
          </Field>
          <Field label="End time" hint="Optional">
            <input type="time" name="endTime" defaultValue={initial.endTime ?? ""} className={inputClass} />
          </Field>
        </div>

        <Field label="Location">
          <input name="location" maxLength={200} defaultValue={initial.location ?? ""} placeholder="327 Maha Chai Rd, Bangkok" className={inputClass} />
        </Field>
        <Field label="Map link" hint="Paste a Google Maps link (optional)">
          <input type="url" name="mapUrl" defaultValue={initial.mapUrl ?? ""} placeholder="https://maps.app.goo.gl/…" className={inputClass} />
        </Field>
        <Field label="Notes">
          <textarea name="notes" rows={3} maxLength={2000} defaultValue={initial.notes ?? ""} className={inputClass} />
        </Field>

        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium text-slate-700">Who’s going?</legend>
          <div className="flex gap-2">
            {(["everyone", "some"] as const).map((v) => (
              <label
                key={v}
                className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium ${optionFocusRing} ${
                  audience === v ? "border-teal-600 bg-teal-50 text-teal-800" : "border-slate-300 bg-white text-slate-600"
                }`}
              >
                <input
                  type="radio"
                  name="audience"
                  value={v}
                  checked={audience === v}
                  onChange={() => setAudience(v)}
                  className="sr-only"
                />
                {v === "everyone" ? "👥 Everyone" : "Specific people"}
              </label>
            ))}
          </div>
          {audience === "some" && (
            <div className="grid grid-cols-2 gap-2">
              {users.map((u) => (
                <label key={u.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                  <input type="checkbox" name="attendees" value={u.id} defaultChecked={defaultAttendees.includes(u.id)} className="h-4 w-4 accent-teal-700" />
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: u.color }} aria-hidden />
                  {u.username}
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <FormMessage state={state} />
        <div className="flex gap-2">
          <Link href="/" className={`${secondaryButton} flex-1`}>
            Cancel
          </Link>
          <button type="submit" disabled={pending} className={`${primaryButton} flex-1`}>
            {pending ? "Saving…" : initial.id ? "Save changes" : "Add to itinerary"}
          </button>
        </div>
      </form>

      {initial.id && (
        <form
          action={deleteItemAction.bind(null, initial.id)}
          onSubmit={(e) => {
            if (!confirm("Delete this itinerary item for everyone?")) e.preventDefault();
          }}
        >
          <button type="submit" className={`${dangerButton} w-full`}>
            Delete item
          </button>
        </form>
      )}
    </div>
  );
}
