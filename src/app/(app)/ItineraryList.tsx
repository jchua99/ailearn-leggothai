"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CATEGORY_ICONS } from "@/lib/constants";
import { scheduleStatus } from "@/lib/schedule";
import { formatDayLabel, nowInTimeZone, toMinutes } from "@/lib/time";
import { UserChip } from "@/components/ui";

type Item = {
  id: number;
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
  createdBy: number;
};

type MiniUser = { id: number; username: string; color: string };
type Now = { date: string; time: string; minutes: number };

const REFRESH_MS = 30_000;

function addDays(date: string, n: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Every trip day (even empty ones) plus any day that has items outside the trip range. */
function daysToShow(items: Item[], start: string, end: string) {
  const days = new Set(items.map((i) => i.date));
  for (let d = start; d <= end; d = addDays(d, 1)) days.add(d);
  return [...days].sort();
}

function timeLabel(item: Item) {
  if (!item.startTime) return "All day";
  if (!item.endTime) return item.startTime;
  const overnight = item.endTime < item.startTime;
  return `${item.startTime}–${item.endTime}${overnight ? " (+1)" : ""}`;
}

export function ItineraryList({
  items,
  users,
  currentUserId,
  timeZone,
  tripStart,
  tripEnd,
  initialNow,
}: {
  items: Item[];
  users: MiniUser[];
  currentUserId: number;
  timeZone: string;
  tripStart: string;
  tripEnd: string;
  initialNow: Now;
}) {
  const [now, setNow] = useState<Now>(initialNow);

  // Keep the "happening now" highlight in sync with the trip-local clock.
  useEffect(() => {
    const id = setInterval(() => {
      const w = nowInTimeZone(timeZone);
      setNow({ ...w, minutes: toMinutes(w.date, w.time) });
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [timeZone]);

  // On open, jump to what's happening now (or next) unless the URL points at a specific item.
  useEffect(() => {
    if (window.location.hash) return;
    const el = document.querySelector('[data-now="current"]') ?? document.querySelector('[data-now="next"]');
    el?.scrollIntoView({ block: "center", behavior: "instant" });
  }, []);

  const status = useMemo(() => scheduleStatus(items, now.minutes), [items, now.minutes]);
  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const days = useMemo(() => daysToShow(items, tripStart, tripEnd), [items, tripStart, tripEnd]);

  if (items.length === 0 && days.length === 0) {
    return <p className="py-10 text-center text-slate-500">Nothing planned yet.</p>;
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-slate-500">
        Trip time now: <span className="font-semibold text-slate-700">{now.time}</span> ({formatDayLabel(now.date)})
      </p>

      {days.map((day) => {
        const dayItems = items.filter((i) => i.date === day);
        const isToday = day === now.date;
        const isPast = day < now.date;
        return (
          <section key={day} aria-labelledby={`day-${day}`}>
            <h2
              id={`day-${day}`}
              className={`mb-2 flex items-center gap-2 text-sm font-semibold ${isPast ? "text-slate-400" : "text-slate-700"}`}
            >
              {formatDayLabel(day)}
              {isToday && <span className="rounded-full bg-teal-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Today</span>}
            </h2>

            {dayItems.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-400">Nothing planned</p>
            ) : (
              <ol className="space-y-2">
                {dayItems.map((item) => {
                  const isCurrent = status.currentIds.includes(item.id);
                  const isNext = status.nextId === item.id;
                  const creator = userById.get(item.createdBy);
                  return (
                    <li
                      key={item.id}
                      id={`item-${item.id}`}
                      data-now={isCurrent ? "current" : isNext ? "next" : undefined}
                      className={`relative rounded-xl border bg-white p-4 shadow-sm transition ${
                        isCurrent
                          ? "border-teal-600 ring-2 ring-teal-600/30 bg-teal-50"
                          : isNext
                            ? "border-amber-400"
                            : isPast
                              ? "border-slate-200 opacity-70"
                              : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-20 shrink-0 pt-0.5 font-mono text-xs font-semibold text-slate-600">
                          {timeLabel(item)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {isCurrent && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-teal-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Now
                              </span>
                            )}
                            {isNext && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                                Up next
                              </span>
                            )}
                          </div>
                          <h3 className="mt-0.5 font-semibold text-slate-900">
                            <span aria-hidden className="mr-1">{CATEGORY_ICONS[item.category] ?? "📌"}</span>
                            {item.title}
                          </h3>
                          {item.location && (
                            <p className="mt-0.5 text-sm text-slate-600">
                              📍{" "}
                              {item.mapUrl ? (
                                <a href={item.mapUrl} target="_blank" rel="noreferrer" className="text-teal-700 underline">
                                  {item.location}
                                </a>
                              ) : (
                                item.location
                              )}
                            </p>
                          )}
                          {!item.location && item.mapUrl && (
                            <a href={item.mapUrl} target="_blank" rel="noreferrer" className="mt-0.5 block text-sm text-teal-700 underline">
                              📍 Open map
                            </a>
                          )}
                          {item.notes && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{item.notes}</p>}
                          <div className="mt-2 flex flex-wrap items-center gap-1">
                            {item.forEveryone ? (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">👥 Everyone</span>
                            ) : (
                              item.attendeeIds.map((id) => {
                                const u = userById.get(id);
                                return u ? <UserChip key={id} user={u} you={id === currentUserId} /> : null;
                              })
                            )}
                          </div>
                          <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                            <span>Added by {creator?.username ?? "someone"}</span>
                            <Link href={`/itinerary/${item.id}`} className="font-medium text-teal-700 hover:underline">
                              Edit
                            </Link>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        );
      })}
    </div>
  );
}
