"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { deleteExpenseAction, saveExpenseAction } from "@/app/actions";
import { CATEGORY_ICONS, EXPENSE_CATEGORIES, expenseCategoryFor } from "@/lib/constants";
import { formatMoney, parseAmountToCents, splitEqually } from "@/lib/money";
import { formatDayLabel } from "@/lib/time";
import { dangerButton, Field, FormMessage, inputClass, primaryButton, secondaryButton } from "@/components/ui";

type MiniUser = { id: number; username: string; color: string };
type MiniItem = { id: number; title: string; date: string; startTime: string | null; category: string };

export type ExpenseFormValues = {
  id?: number;
  amount: string;
  description: string;
  category: string;
  spentDate: string;
  spentTime: string;
  paidBy: number;
  splitType: "personal" | "equal";
  splitUserIds: number[];
  itemId: number | null;
};

export function ExpenseForm({
  initial,
  users,
  items,
  currency,
}: {
  initial: ExpenseFormValues;
  users: MiniUser[];
  items: MiniItem[];
  currency: string;
}) {
  const [state, action, pending] = useActionState(saveExpenseAction, undefined);
  const [amount, setAmount] = useState(initial.amount);
  const [description, setDescription] = useState(initial.description);
  const [category, setCategory] = useState(initial.category);
  const [itemId, setItemId] = useState(initial.itemId ? String(initial.itemId) : "");
  const [splitType, setSplitType] = useState(initial.splitType);
  const [splitUserIds, setSplitUserIds] = useState<number[]>(initial.splitUserIds);

  const itemById = new Map(items.map((i) => [String(i.id), i]));

  function onLinkItem(next: string) {
    const prev = itemById.get(itemId);
    const item = itemById.get(next);
    setItemId(next);
    if (!item) return;
    // Only overwrite the description if the user hasn't typed their own.
    if (!description.trim() || description === prev?.title) setDescription(item.title);
    setCategory(expenseCategoryFor(item.category));
  }

  function toggleSplitUser(id: number) {
    setSplitUserIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  const cents = parseAmountToCents(amount);
  const orderedSplit = users.map((u) => u.id).filter((id) => splitUserIds.includes(id));
  const preview =
    splitType === "equal" && cents && orderedSplit.length
      ? splitEqually(cents, orderedSplit)
      : null;

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4">
        {initial.id && <input type="hidden" name="id" value={initial.id} />}

        <Field label={`Amount (${currency})`}>
          <input
            name="amount"
            required
            inputMode="decimal"
            autoFocus={!initial.id}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className={`${inputClass} text-2xl font-semibold`}
          />
        </Field>

        <Field label="Linked itinerary item" hint="Optional — fills in the description and category">
          <select name="itemId" value={itemId} onChange={(e) => onLinkItem(e.target.value)} className={inputClass}>
            <option value="">— None —</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {formatDayLabel(i.date)} {i.startTime ?? ""} · {i.title}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Description">
          <input
            name="description"
            required
            maxLength={100}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Pad thai & drinks"
            className={inputClass}
          />
        </Field>

        <Field label="Category">
          <select name="category" value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_ICONS[c]} {c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <input type="date" name="spentDate" required defaultValue={initial.spentDate} className={inputClass} />
          </Field>
          <Field label="Time">
            <input type="time" name="spentTime" required defaultValue={initial.spentTime} className={inputClass} />
          </Field>
        </div>

        <Field label="Paid by">
          <select name="paidBy" defaultValue={initial.paidBy} className={inputClass}>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username}
              </option>
            ))}
          </select>
        </Field>

        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium text-slate-700">Split</legend>
          <div className="flex gap-2">
            {(["personal", "equal"] as const).map((v) => (
              <label
                key={v}
                className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium ${
                  splitType === v ? "border-teal-600 bg-teal-50 text-teal-800" : "border-slate-300 bg-white text-slate-600"
                }`}
              >
                <input type="radio" name="splitType" value={v} checked={splitType === v} onChange={() => setSplitType(v)} className="sr-only" />
                {v === "personal" ? "🙋 Personal" : "➗ Split equally"}
              </label>
            ))}
          </div>

          {splitType === "personal" ? (
            <p className="text-xs text-slate-500">Not shared — counts only toward the payer’s spending.</p>
          ) : (
            <>
              <div className="flex justify-end gap-3 text-xs font-medium text-teal-700">
                <button type="button" onClick={() => setSplitUserIds(users.map((u) => u.id))}>All</button>
                <button type="button" onClick={() => setSplitUserIds([])}>None</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {users.map((u) => {
                  const share = preview?.find((s) => s.userId === u.id)?.shareCents;
                  return (
                    <label key={u.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
                      <input
                        type="checkbox"
                        name="splitUsers"
                        value={u.id}
                        checked={splitUserIds.includes(u.id)}
                        onChange={() => toggleSplitUser(u.id)}
                        className="h-4 w-4 accent-teal-700"
                      />
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: u.color }} aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{u.username}</span>
                      {share !== undefined && <span className="text-xs text-slate-500">{formatMoney(share, currency)}</span>}
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </fieldset>

        <FormMessage state={state} />
        <div className="flex gap-2">
          <Link href="/expenses" className={`${secondaryButton} flex-1`}>
            Cancel
          </Link>
          <button type="submit" disabled={pending} className={`${primaryButton} flex-1`}>
            {pending ? "Saving…" : initial.id ? "Save changes" : "Add expense"}
          </button>
        </div>
      </form>

      {initial.id && (
        <form
          action={deleteExpenseAction.bind(null, initial.id)}
          onSubmit={(e) => {
            if (!confirm("Delete this expense? Balances will be recalculated.")) e.preventDefault();
          }}
        >
          <button type="submit" className={`${dangerButton} w-full`}>
            Delete expense
          </button>
        </form>
      )}
    </div>
  );
}
