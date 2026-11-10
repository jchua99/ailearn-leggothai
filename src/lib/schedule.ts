import { dayStartMinutes, MINUTES_PER_DAY, toMinutes } from "./time";

export type ScheduleItem = {
  id: number;
  date: string;
  /** null = all-day item */
  startTime: string | null;
  endTime: string | null;
};

export type ScheduleStatus = {
  /** Items happening right now (may be several if they overlap). */
  currentIds: number[];
  /** The next timed item to start after now. */
  nextId: number | null;
};

type Window = { id: number; start: number; end: number };

/**
 * Work out when each timed item starts and ends (in wall-clock minutes).
 * - Explicit end time wins; an end before the start means it ends the next day.
 * - No end time: lasts until the next item that starts strictly later, capped at end of its day.
 * - All-day items (no start time) have no window.
 */
export function itemWindows(items: ScheduleItem[]): Window[] {
  const timed = items
    .filter((i) => i.startTime)
    .map((i) => ({ item: i, start: toMinutes(i.date, i.startTime!) }))
    .sort((a, b) => a.start - b.start || a.item.id - b.item.id);

  return timed.map(({ item, start }) => {
    let end: number;
    if (item.endTime) {
      end = toMinutes(item.date, item.endTime);
      if (end <= start) end += MINUTES_PER_DAY;
    } else {
      const endOfDay = dayStartMinutes(item.date) + MINUTES_PER_DAY;
      const nextStart = timed.find((t) => t.start > start)?.start ?? Infinity;
      end = Math.min(nextStart, endOfDay);
    }
    return { id: item.id, start, end };
  });
}

export function scheduleStatus(items: ScheduleItem[], nowMinutes: number): ScheduleStatus {
  const windows = itemWindows(items);
  const currentIds = windows
    .filter((w) => w.start <= nowMinutes && nowMinutes < w.end)
    .map((w) => w.id);
  const next = windows.find((w) => w.start > nowMinutes);
  return { currentIds, nextId: next?.id ?? null };
}
