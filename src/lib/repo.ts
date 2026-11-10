/**
 * Data access. Framework-free (no Next.js imports) so scripts like the seed can reuse it.
 * Validation of user input happens in the server actions; this layer trusts its inputs.
 */
import { asc, desc, eq, sql } from "drizzle-orm";
import type { Db } from "@/db";
import {
  expenseShares,
  expenses,
  itineraryAttendees,
  itineraryItems,
  settlements,
  trip,
  users,
  type Trip,
} from "@/db/schema";
import { MAX_USERS, USER_COLORS } from "./constants";
import { splitEqually } from "./money";

// ---------- users ----------

export async function listUsers(db: Db) {
  return db.select().from(users).orderBy(asc(users.id));
}

export async function getUser(db: Db, id: number) {
  const [u] = await db.select().from(users).where(eq(users.id, id));
  return u ?? null;
}

export async function listUserIds(db: Db): Promise<number[]> {
  const rows = await db.select({ id: users.id }).from(users).orderBy(asc(users.id));
  return rows.map((r) => r.id);
}

/** True for SQLite UNIQUE violations, however deeply the driver/ORM wrapped them. */
function isUniqueViolation(err: unknown): boolean {
  for (let e: unknown = err; e; e = (e as { cause?: unknown }).cause) {
    const { code, message } = e as { code?: unknown; message?: unknown };
    if (typeof code === "string" && code.startsWith("SQLITE_CONSTRAINT")) return true;
    if (typeof message === "string" && message.includes("UNIQUE constraint failed")) return true;
  }
  return false;
}

export type CreateUserResult = { ok: true; id: number } | { ok: false; error: string };

export async function createUser(db: Db, username: string): Promise<CreateUserResult> {
  const full = { ok: false, error: `This trip already has the maximum of ${MAX_USERS} people.` } as const;
  const taken = { ok: false, error: `"${username}" is already taken — pick it from the login list instead.` } as const;

  const existing = await listUsers(db);
  if (existing.length >= MAX_USERS) return full;
  const key = username.toLowerCase();
  if (existing.some((u) => u.usernameKey === key)) return taken;
  const used = new Set(existing.map((u) => u.color));
  const color = USER_COLORS.find((c) => !used.has(c)) ?? USER_COLORS[existing.length % USER_COLORS.length];

  try {
    // The checks above give friendly errors; this single statement is what actually enforces the cap,
    // atomically, so concurrent sign-ups can't both slip in as the 10th person.
    const rows = await db.all<{ id: number }>(sql`
      INSERT INTO ${users} (username, username_key, color)
      SELECT ${username}, ${key}, ${color}
      WHERE (SELECT COUNT(*) FROM ${users}) < ${MAX_USERS}
      RETURNING id`);
    return rows[0] ? { ok: true, id: rows[0].id } : full;
  } catch (err) {
    // Same name signed up concurrently: the UNIQUE index on username_key caught it.
    if (isUniqueViolation(err)) return taken;
    throw err;
  }
}

export async function renameUser(db: Db, id: number, username: string): Promise<{ ok: boolean; error?: string }> {
  const taken = { ok: false, error: `"${username}" is already taken.` };
  const key = username.toLowerCase();
  const [clash] = await db.select({ id: users.id }).from(users).where(eq(users.usernameKey, key));
  if (clash && clash.id !== id) return taken;
  try {
    await db.update(users).set({ username, usernameKey: key }).where(eq(users.id, id));
  } catch (err) {
    // Someone else grabbed the name between the check and the update.
    if (isUniqueViolation(err)) return taken;
    throw err;
  }
  return { ok: true };
}

// ---------- trip ----------

export async function getTrip(db: Db): Promise<Trip | null> {
  const [t] = await db.select().from(trip).where(eq(trip.id, 1));
  return t ?? null;
}

export async function saveTrip(db: Db, values: Omit<Trip, "id">) {
  await db
    .insert(trip)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: trip.id, set: values });
}

// ---------- itinerary ----------

export type ItemInput = {
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

export async function listItineraryWithAttendees(db: Db) {
  const items = await db
    .select()
    .from(itineraryItems)
    .orderBy(asc(itineraryItems.date), sql`${itineraryItems.startTime} IS NOT NULL`, asc(itineraryItems.startTime), asc(itineraryItems.id));
  const attendees = await db.select().from(itineraryAttendees);
  return items.map((item) => ({
    ...item,
    attendeeIds: attendees.filter((a) => a.itemId === item.id).map((a) => a.userId),
  }));
}

export type ItineraryItemWithAttendees = Awaited<ReturnType<typeof listItineraryWithAttendees>>[number];

export async function listItineraryItemIds(db: Db): Promise<number[]> {
  const rows = await db.select({ id: itineraryItems.id }).from(itineraryItems);
  return rows.map((r) => r.id);
}

export async function itineraryItemExists(db: Db, id: number): Promise<boolean> {
  const [row] = await db.select({ id: itineraryItems.id }).from(itineraryItems).where(eq(itineraryItems.id, id));
  return !!row;
}

export async function getItineraryItem(db: Db, id: number) {
  const [item] = await db.select().from(itineraryItems).where(eq(itineraryItems.id, id));
  if (!item) return null;
  const attendees = await db.select().from(itineraryAttendees).where(eq(itineraryAttendees.itemId, id));
  return { ...item, attendeeIds: attendees.map((a) => a.userId) };
}

export async function createItineraryItem(db: Db, input: ItemInput, createdBy: number) {
  return db.transaction(async (tx) => {
    const { attendeeIds, ...values } = input;
    const [row] = await tx
      .insert(itineraryItems)
      .values({ ...values, createdBy })
      .returning({ id: itineraryItems.id });
    if (!input.forEveryone && attendeeIds.length) {
      await tx.insert(itineraryAttendees).values(attendeeIds.map((userId) => ({ itemId: row.id, userId })));
    }
    return row.id;
  });
}

export async function updateItineraryItem(db: Db, id: number, input: ItemInput) {
  await db.transaction(async (tx) => {
    const { attendeeIds, ...values } = input;
    await tx.update(itineraryItems).set(values).where(eq(itineraryItems.id, id));
    await tx.delete(itineraryAttendees).where(eq(itineraryAttendees.itemId, id));
    if (!input.forEveryone && attendeeIds.length) {
      await tx.insert(itineraryAttendees).values(attendeeIds.map((userId) => ({ itemId: id, userId })));
    }
  });
}

export async function deleteItineraryItem(db: Db, id: number) {
  await db.transaction(async (tx) => {
    // Expenses linked to this item keep existing; they just lose the link.
    await tx.update(expenses).set({ itemId: null }).where(eq(expenses.itemId, id));
    await tx.delete(itineraryAttendees).where(eq(itineraryAttendees.itemId, id));
    await tx.delete(itineraryItems).where(eq(itineraryItems.id, id));
  });
}

// ---------- expenses ----------

export type ExpenseInput = {
  description: string;
  amountCents: number;
  category: string;
  spentDate: string;
  spentTime: string;
  paidBy: number;
  splitType: "personal" | "equal";
  /** Who shares an "equal" expense. Ignored for personal. */
  splitUserIds: number[];
  itemId: number | null;
};

function expenseRow(input: ExpenseInput) {
  const { description, amountCents, category, spentDate, spentTime, paidBy, splitType, itemId } = input;
  return { description, amountCents, category, spentDate, spentTime, paidBy, splitType, itemId };
}

function sharesFor(input: ExpenseInput) {
  return input.splitType === "personal"
    ? [{ userId: input.paidBy, shareCents: input.amountCents }]
    : splitEqually(input.amountCents, input.splitUserIds);
}

export async function listExpensesWithShares(db: Db) {
  const rows = await db
    .select()
    .from(expenses)
    .orderBy(desc(expenses.spentDate), desc(expenses.spentTime), desc(expenses.id));
  const shares = await db.select().from(expenseShares);
  return rows.map((e) => ({
    ...e,
    shares: shares
      .filter((s) => s.expenseId === e.id)
      .map((s) => ({ userId: s.userId, shareCents: s.shareCents })),
  }));
}

export async function expenseExists(db: Db, id: number): Promise<boolean> {
  const [row] = await db.select({ id: expenses.id }).from(expenses).where(eq(expenses.id, id));
  return !!row;
}

export async function getExpense(db: Db, id: number) {
  const [e] = await db.select().from(expenses).where(eq(expenses.id, id));
  if (!e) return null;
  const shares = await db.select().from(expenseShares).where(eq(expenseShares.expenseId, id));
  return { ...e, shares: shares.map((s) => ({ userId: s.userId, shareCents: s.shareCents })) };
}

export async function createExpense(db: Db, input: ExpenseInput, createdBy: number) {
  return db.transaction(async (tx) => {
    const values = expenseRow(input);
    const [row] = await tx
      .insert(expenses)
      .values({ ...values, createdBy })
      .returning({ id: expenses.id });
    await tx.insert(expenseShares).values(sharesFor(input).map((s) => ({ ...s, expenseId: row.id })));
    return row.id;
  });
}

export async function updateExpense(db: Db, id: number, input: ExpenseInput) {
  await db.transaction(async (tx) => {
    const values = expenseRow(input);
    await tx.update(expenses).set(values).where(eq(expenses.id, id));
    await tx.delete(expenseShares).where(eq(expenseShares.expenseId, id));
    await tx.insert(expenseShares).values(sharesFor(input).map((s) => ({ ...s, expenseId: id })));
  });
}

export async function deleteExpense(db: Db, id: number) {
  await db.transaction(async (tx) => {
    await tx.delete(expenseShares).where(eq(expenseShares.expenseId, id));
    await tx.delete(expenses).where(eq(expenses.id, id));
  });
}

// ---------- settlements ----------

export async function listSettlements(db: Db) {
  return db.select().from(settlements).orderBy(desc(settlements.id));
}

export async function createSettlement(
  db: Db,
  s: { fromUserId: number; toUserId: number; amountCents: number },
  createdBy: number,
) {
  await db.insert(settlements).values({ ...s, createdBy });
}

export async function deleteSettlement(db: Db, id: number) {
  await db.delete(settlements).where(eq(settlements.id, id));
}

// ---------- maintenance ----------

export async function wipeAll(db: Db) {
  await db.transaction(async (tx) => {
    await tx.delete(settlements);
    await tx.delete(expenseShares);
    await tx.delete(expenses);
    await tx.delete(itineraryAttendees);
    await tx.delete(itineraryItems);
    await tx.delete(trip);
    await tx.delete(users);
  });
}
