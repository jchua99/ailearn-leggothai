/** Wall-clock helpers. All itinerary times are trip-local "YYYY-MM-DD" + "HH:MM" strings. */

export type WallClock = { date: string; time: string };

const MINUTES_PER_DAY = 1440;

/** The current wall-clock date/time in the given IANA time zone (e.g. "Asia/Bangkok"). */
export function nowInTimeZone(timeZone: string, at: Date = new Date()): WallClock {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

/** Minutes since 1970-01-01 00:00 on the wall clock. Only meaningful for comparing wall-clock times. */
export function toMinutes(date: string, time: string = "00:00"): number {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return (Date.UTC(y, m - 1, d) / 60000) + hh * 60 + mm;
}

export function dayStartMinutes(date: string): number {
  return toMinutes(date, "00:00");
}

export { MINUTES_PER_DAY };

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function isValidDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
}

export function isValidTime(s: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

/** "2026-11-10" -> "Tue 10 Nov" */
export function formatDayLabel(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

/** "2026-11-10" -> "10 Nov 2026" */
export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
