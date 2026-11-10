"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { computeBalances, maxRepayment } from "@/lib/money";
import * as repo from "@/lib/repo";
import { endSession, requireUser, startSession } from "@/lib/session";
import { parseExpense, parseItineraryItem, parseSettlement, parseTrip, parseUsername } from "@/lib/validation";

export type FormState = { error?: string; success?: string } | undefined;

// ---------- auth ----------

export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const id = Number(fd.get("userId"));
  const user = Number.isInteger(id) ? await repo.getUser(db, id) : null;
  if (!user) return { error: "Pick your name from the list." };
  await startSession(user.id);
  redirect("/");
}

export async function signupAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = parseUsername(String(fd.get("username") ?? ""));
  if (!parsed.ok) return { error: parsed.error };
  const result = await repo.createUser(db, parsed.value);
  if (!result.ok) return { error: result.error };
  await startSession(result.id);
  redirect("/");
}

export async function logoutAction() {
  await endSession();
  redirect("/login");
}

export async function renameAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseUsername(String(fd.get("username") ?? ""));
  if (!parsed.ok) return { error: parsed.error };
  const result = await repo.renameUser(db, user.id, parsed.value);
  if (!result.ok) return { error: result.error };
  revalidatePath("/", "layout");
  return { success: "Name updated." };
}

// ---------- trip ----------

export async function saveTripAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const parsed = parseTrip(fd);
  if (!parsed.ok) return { error: parsed.error };
  await repo.saveTrip(db, parsed.value);
  revalidatePath("/", "layout");
  if (fd.get("fromSetup")) redirect("/");
  return { success: "Trip settings saved." };
}

// ---------- itinerary & expenses ----------

/**
 * Shared create-or-update flow for forms with an optional hidden `id`:
 * no id → create; id → update, unless someone else deleted the row meanwhile.
 */
async function saveWithId(
  fd: FormData,
  ops: {
    exists: (id: number) => Promise<boolean>;
    update: (id: number) => Promise<void>;
    create: () => Promise<number>;
    goneMessage: string;
  },
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const id = Number(fd.get("id"));
  if (!id) return { ok: true, id: await ops.create() };
  if (!(await ops.exists(id))) return { ok: false, error: ops.goneMessage };
  await ops.update(id);
  return { ok: true, id };
}

export async function saveItemAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseItineraryItem(fd, await repo.listUserIds(db));
  if (!parsed.ok) return { error: parsed.error };

  const saved = await saveWithId(fd, {
    exists: (id) => repo.itineraryItemExists(db, id),
    update: (id) => repo.updateItineraryItem(db, id, parsed.value),
    create: () => repo.createItineraryItem(db, parsed.value, user.id),
    goneMessage: "This item was deleted by someone else.",
  });
  if (!saved.ok) return { error: saved.error };
  revalidatePath("/");
  redirect(`/#item-${saved.id}`);
}

export async function deleteItemAction(id: number) {
  await requireUser();
  await repo.deleteItineraryItem(db, id);
  revalidatePath("/", "layout");
  redirect("/");
}

export async function saveExpenseAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const [userIds, itemIds] = await Promise.all([repo.listUserIds(db), repo.listItineraryItemIds(db)]);
  const parsed = parseExpense(fd, userIds, itemIds);
  if (!parsed.ok) return { error: parsed.error };

  const saved = await saveWithId(fd, {
    exists: (id) => repo.expenseExists(db, id),
    update: (id) => repo.updateExpense(db, id, parsed.value),
    create: () => repo.createExpense(db, parsed.value, user.id),
    goneMessage: "This expense was deleted by someone else.",
  });
  if (!saved.ok) return { error: saved.error };
  revalidatePath("/", "layout");
  redirect("/expenses");
}

export async function deleteExpenseAction(id: number) {
  await requireUser();
  await repo.deleteExpense(db, id);
  revalidatePath("/", "layout");
  redirect("/expenses");
}

// ---------- settlements ----------

/**
 * The amount comes from the "Mark settled" button rendered earlier, so it may be stale (second tab,
 * double tap, another phone). Re-check against live balances and never record more than is still owed —
 * otherwise a repeat submit would flip the debt the other way.
 */
export async function recordSettlementAction(fromUserId: number, toUserId: number, amountCents: number) {
  const user = await requireUser();
  const [userIds, expenses, settlements] = await Promise.all([
    repo.listUserIds(db),
    repo.listExpensesWithShares(db),
    repo.listSettlements(db),
  ]);
  const parsed = parseSettlement({ fromUserId, toUserId, amountCents }, userIds);
  if (parsed.ok) {
    const owed = maxRepayment(computeBalances(userIds, expenses, settlements), fromUserId, toUserId);
    const amount = Math.min(parsed.value.amountCents, owed);
    if (amount > 0) await repo.createSettlement(db, { fromUserId, toUserId, amountCents: amount }, user.id);
  }
  revalidatePath("/balances");
}

export async function undoSettlementAction(id: number) {
  await requireUser();
  await repo.deleteSettlement(db, id);
  revalidatePath("/balances");
}
