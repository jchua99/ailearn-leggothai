"use client";

import { saveTripAction } from "@/app/actions";
import { useFormAction } from "./useFormAction";
import type { Trip } from "@/db/schema";
import { Field, FormMessage, inputClass, primaryButton } from "./ui";

const COMMON_CURRENCIES = ["THB", "SGD", "MYR", "USD", "EUR", "JPY", "KRW", "AUD", "GBP", "IDR", "VND"];

export function TripForm({
  trip,
  fromSetup,
  timeZones,
}: {
  trip: Omit<Trip, "id"> | null;
  fromSetup?: boolean;
  timeZones: string[];
}) {
  const { state, onSubmit, pending } = useFormAction(saveTripAction);
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {fromSetup && <input type="hidden" name="fromSetup" value="1" />}
      <Field label="Trip name">
        <input name="name" required maxLength={60} defaultValue={trip?.name ?? ""} placeholder="Thailand 2026" className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Start date">
          <input type="date" name="startDate" required defaultValue={trip?.startDate ?? ""} className={inputClass} />
        </Field>
        <Field label="End date">
          <input type="date" name="endDate" required defaultValue={trip?.endDate ?? ""} className={inputClass} />
        </Field>
      </div>
      <Field label="Time zone" hint="Itinerary times and the “happening now” highlight use this zone.">
        <input
          name="timezone"
          required
          list="tz-list"
          defaultValue={trip?.timezone ?? "Asia/Bangkok"}
          className={inputClass}
        />
        <datalist id="tz-list">
          {timeZones.map((tz) => (
            <option key={tz} value={tz} />
          ))}
        </datalist>
      </Field>
      <Field label="Currency" hint="3-letter code. All expenses are entered in this currency.">
        <input
          name="currency"
          required
          list="currency-list"
          maxLength={3}
          defaultValue={trip?.currency ?? "THB"}
          className={`${inputClass} uppercase`}
        />
        <datalist id="currency-list">
          {COMMON_CURRENCIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className={`${primaryButton} w-full`}>
        {pending ? "Saving…" : fromSetup ? "Create trip" : "Save trip settings"}
      </button>
    </form>
  );
}
