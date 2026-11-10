"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import * as repo from "@/lib/repo";
import { endSession, requireUser, startSession } from "@/lib/session";
import { parseExpense, parseItineraryItem, parseTrip, parseUsername } from "@/lib/validation";

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

// ---------- itinerary ----------

export async function saveItemAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const userIds = (await repo.listUsers(db)).map((u) => u.id);
  const parsed = parseItineraryItem(fd, userIds);
  if (!parsed.ok) return { error: parsed.error };

  const id = Number(fd.get("id"));
  let itemId: number;
  if (id) {
    if (!(await repo.getItineraryItem(db, id))) return { error: "This item was deleted by someone else." };
    await repo.updateItineraryItem(db, id, parsed.value);
    itemId = id;
  } else {
    itemId = await repo.createItineraryItem(db, parsed.value, user.id);
  }
  revalidatePath("/");
  redirect(`/#item-${itemId}`);
}

export async function deleteItemAction(id: number) {
  await requireUser();
  await repo.deleteItineraryItem(db, id);
  revalidatePath("/", "layout");
  redirect("/");
}

// ---------- expenses ----------

export async function saveExpenseAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const userIds = (await repo.listUsers(db)).map((u) => u.id);
  const itemIds = (await repo.listItineraryWithAttendees(db)).map((i) => i.id);
  const parsed = parseExpense(fd, userIds, itemIds);
  if (!parsed.ok) return { error: parsed.error };

  const id = Number(fd.get("id"));
  if (id) {
    if (!(await repo.getExpense(db, id))) return { error: "This expense was deleted by someone else." };
    await repo.updateExpense(db, id, parsed.value);
  } else {
    await repo.createExpense(db, parsed.value, user.id);
  }
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

export async function recordSettlementAction(fromUserId: number, toUserId: number, amountCents: number) {
  const user = await requireUser();
  if (!(amountCents > 0) || fromUserId === toUserId) return;
  await repo.createSettlement(db, { fromUserId, toUserId, amountCents }, user.id);
  revalidatePath("/balances");
}

export async function undoSettlementAction(id: number) {
  await requireUser();
  await repo.deleteSettlement(db, id);
  revalidatePath("/balances");
}
