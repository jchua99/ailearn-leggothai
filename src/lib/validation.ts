/** Parse + validate form submissions. Pure functions: FormData in, typed input or error out. */
import { EXPENSE_CATEGORIES, ITINERARY_CATEGORIES } from "./constants";
import { parseAmountToCents } from "./money";
import type { ExpenseInput, ItemInput } from "./repo";
import { isValidDate, isValidTime, isValidTimeZone } from "./time";

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const optional = (fd: FormData, key: string) => str(fd, key) || null;
const ids = (fd: FormData, key: string) =>
  [...new Set(fd.getAll(key).map(Number).filter((n) => Number.isInteger(n) && n > 0))];

export function parseUsername(raw: string): Parsed<string> {
  const username = raw.trim().replace(/\s+/g, " ");
  if (username.length < 2 || username.length > 20) {
    return { ok: false, error: "Username must be 2–20 characters." };
  }
  if (!/^[\p{L}\p{N} _.'-]+$/u.test(username)) {
    return { ok: false, error: "Use letters, numbers, spaces, or . _ ' - only." };
  }
  return { ok: true, value: username };
}

export function parseTrip(fd: FormData): Parsed<{
  name: string;
  startDate: string;
  endDate: string;
  timezone: string;
  currency: string;
}> {
  const name = str(fd, "name");
  const startDate = str(fd, "startDate");
  const endDate = str(fd, "endDate");
  const timezone = str(fd, "timezone");
  const currency = str(fd, "currency").toUpperCase();

  if (!name || name.length > 60) return { ok: false, error: "Trip name must be 1–60 characters." };
  if (!isValidDate(startDate) || !isValidDate(endDate)) return { ok: false, error: "Enter valid start and end dates." };
  if (endDate < startDate) return { ok: false, error: "End date can't be before the start date." };
  if (!isValidTimeZone(timezone)) return { ok: false, error: `"${timezone}" isn't a known time zone (e.g. Asia/Bangkok).` };
  if (!/^[A-Z]{3}$/.test(currency)) return { ok: false, error: "Currency must be a 3-letter code like THB." };
  try {
    new Intl.NumberFormat("en", { style: "currency", currency });
  } catch {
    return { ok: false, error: `"${currency}" isn't a known currency code.` };
  }
  return { ok: true, value: { name, startDate, endDate, timezone, currency } };
}

export function parseItineraryItem(fd: FormData, validUserIds: number[]): Parsed<ItemInput> {
  const date = str(fd, "date");
  const startTime = optional(fd, "startTime");
  const endTime = optional(fd, "endTime");
  const title = str(fd, "title");
  const category = str(fd, "category");
  const location = optional(fd, "location");
  const mapUrl = optional(fd, "mapUrl");
  const notes = optional(fd, "notes");
  const forEveryone = str(fd, "audience") !== "some";
  const attendeeIds = ids(fd, "attendees").filter((id) => validUserIds.includes(id));

  if (!isValidDate(date)) return { ok: false, error: "Pick a date." };
  if (startTime && !isValidTime(startTime)) return { ok: false, error: "Start time is invalid." };
  if (endTime && !isValidTime(endTime)) return { ok: false, error: "End time is invalid." };
  if (endTime && !startTime) return { ok: false, error: "Add a start time, or clear the end time." };
  if (endTime && endTime === startTime) return { ok: false, error: "End time must differ from start time." };
  if (!title || title.length > 100) return { ok: false, error: "Title must be 1–100 characters." };
  if (!(ITINERARY_CATEGORIES as readonly string[]).includes(category)) return { ok: false, error: "Pick a category." };
  if (location && location.length > 200) return { ok: false, error: "Location is too long." };
  if (notes && notes.length > 2000) return { ok: false, error: "Notes are too long." };
  if (mapUrl && !/^https?:\/\/\S+$/i.test(mapUrl)) return { ok: false, error: "Map link must start with http:// or https://" };
  if (!forEveryone && attendeeIds.length === 0) return { ok: false, error: "Tick at least one person, or choose Everyone." };

  return {
    ok: true,
    value: {
      date,
      startTime,
      endTime,
      title,
      category,
      location,
      mapUrl,
      notes,
      forEveryone,
      attendeeIds: forEveryone ? [] : attendeeIds,
    },
  };
}

export function parseExpense(
  fd: FormData,
  validUserIds: number[],
  validItemIds: number[],
): Parsed<ExpenseInput> {
  const amountCents = parseAmountToCents(str(fd, "amount"));
  const description = str(fd, "description");
  const category = str(fd, "category");
  const spentDate = str(fd, "spentDate");
  const spentTime = str(fd, "spentTime");
  const paidBy = Number(str(fd, "paidBy"));
  const splitType = str(fd, "splitType") === "equal" ? "equal" : "personal";
  // Keep the split list in member order so leftover cents go to people deterministically.
  const ticked = ids(fd, "splitUsers");
  const splitUserIds = validUserIds.filter((id) => ticked.includes(id));
  const itemRaw = str(fd, "itemId");
  const itemId = itemRaw ? Number(itemRaw) : null;

  if (amountCents === null) return { ok: false, error: "Enter an amount greater than 0 (up to 2 decimals)." };
  if (!description || description.length > 100) return { ok: false, error: "Description must be 1–100 characters." };
  if (!(EXPENSE_CATEGORIES as readonly string[]).includes(category)) return { ok: false, error: "Pick a category." };
  if (!isValidDate(spentDate) || !isValidTime(spentTime)) return { ok: false, error: "Enter a valid date and time." };
  if (!validUserIds.includes(paidBy)) return { ok: false, error: "Pick who paid." };
  if (splitType === "equal" && splitUserIds.length === 0) return { ok: false, error: "Tick at least one person to split with." };
  if (itemId !== null && !validItemIds.includes(itemId)) return { ok: false, error: "That itinerary item no longer exists." };

  return {
    ok: true,
    value: { amountCents, description, category, spentDate, spentTime, paidBy, splitType, splitUserIds, itemId },
  };
}

export type SettlementInput = { fromUserId: number; toUserId: number; amountCents: number };

/** Settlement args arrive as bound Server Action arguments, which the client can tamper with. */
export function parseSettlement(raw: SettlementInput, validUserIds: number[]): Parsed<SettlementInput> {
  const { fromUserId, toUserId, amountCents } = raw;
  if (!validUserIds.includes(fromUserId) || !validUserIds.includes(toUserId)) {
    return { ok: false, error: "Unknown person." };
  }
  if (fromUserId === toUserId) return { ok: false, error: "Can't repay yourself." };
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) return { ok: false, error: "Invalid amount." };
  return { ok: true, value: { fromUserId, toUserId, amountCents } };
}
