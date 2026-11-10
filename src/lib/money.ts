/** Money is always integer cents (minor units) to avoid floating-point errors. */

export type Share = { userId: number; shareCents: number };

export type ExpenseForBalance = {
  paidBy: number;
  amountCents: number;
  shares: Share[];
};

export type SettlementForBalance = {
  fromUserId: number;
  toUserId: number;
  amountCents: number;
};

export type Transfer = SettlementForBalance;

/** "1,200.50" -> 120050. Returns null for anything that isn't a positive amount with ≤ 2 decimals. */
export function parseAmountToCents(input: string): number | null {
  const trimmed = input.trim();
  // Commas are only allowed as proper thousands separators: "1,200" yes, "1,2,3" or "1,,000" no.
  if (!/^(\d{1,3}(,\d{3})+|\d+)(\.\d{1,2})?$/.test(trimmed)) return null;
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(trimmed.replace(/,/g, ""));
  if (!match) return null;
  const cents = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents <= 0) return null;
  return cents;
}

export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(/\.00$/, "");
}

export function formatMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

/** Formatter bound to the trip currency, e.g. `const money = moneyFormatter(trip.currency)`. */
export function moneyFormatter(currency: string): (cents: number) => string {
  return (cents) => formatMoney(cents, currency);
}

/**
 * Split equally. Leftover cents go to the first people in the list,
 * so shares always add up to exactly the total.
 */
export function splitEqually(totalCents: number, userIds: number[]): Share[] {
  if (userIds.length === 0) throw new Error("Cannot split between zero people");
  const base = Math.floor(totalCents / userIds.length);
  const remainder = totalCents - base * userIds.length;
  return userIds.map((userId, i) => ({ userId, shareCents: base + (i < remainder ? 1 : 0) }));
}

/** Net balance per user: positive = is owed money, negative = owes money. */
export function computeBalances(
  userIds: number[],
  expenses: ExpenseForBalance[],
  settlements: SettlementForBalance[],
): Record<number, number> {
  const balances: Record<number, number> = {};
  for (const id of userIds) balances[id] = 0;
  const add = (id: number, delta: number) => {
    balances[id] = (balances[id] ?? 0) + delta;
  };

  for (const e of expenses) {
    add(e.paidBy, e.amountCents);
    for (const s of e.shares) add(s.userId, -s.shareCents);
  }
  for (const s of settlements) {
    // The debtor handed over cash: their debt shrinks, the creditor is owed less.
    add(s.fromUserId, s.amountCents);
    add(s.toUserId, -s.amountCents);
  }
  return balances;
}

/**
 * The most `fromUserId` can repay `toUserId` right now without flipping either balance:
 * the smaller of what the debtor owes and what the creditor is owed. 0 if no repayment makes sense.
 */
export function maxRepayment(balances: Record<number, number>, fromUserId: number, toUserId: number): number {
  const owes = -(balances[fromUserId] ?? 0);
  const owed = balances[toUserId] ?? 0;
  return Math.max(0, Math.min(owes, owed));
}

/** Greedy largest-debtor → largest-creditor matching. At most n-1 transfers. */
export function suggestSettlements(balances: Record<number, number>): Transfer[] {
  const creditors = Object.entries(balances)
    .filter(([, v]) => v > 0)
    .map(([id, v]) => ({ id: Number(id), amount: v }));
  const debtors = Object.entries(balances)
    .filter(([, v]) => v < 0)
    .map(([id, v]) => ({ id: Number(id), amount: -v }));

  const transfers: Transfer[] = [];
  while (creditors.length && debtors.length) {
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);
    const c = creditors[0];
    const d = debtors[0];
    const amount = Math.min(c.amount, d.amount);
    transfers.push({ fromUserId: d.id, toUserId: c.id, amountCents: amount });
    c.amount -= amount;
    d.amount -= amount;
    if (c.amount === 0) creditors.shift();
    if (d.amount === 0) debtors.shift();
  }
  return transfers;
}

export type UserSpending = {
  /** Money that left this person's pocket. */
  paidCents: number;
  /** What this person actually consumed: personal expenses + their share of splits. */
  costCents: number;
  costByCategory: Record<string, number>;
};

export function spendingSummary(
  userIds: number[],
  expenses: (ExpenseForBalance & { category: string })[],
) {
  const byUser: Record<number, UserSpending> = {};
  for (const id of userIds) byUser[id] = { paidCents: 0, costCents: 0, costByCategory: {} };
  const ensure = (id: number) => (byUser[id] ??= { paidCents: 0, costCents: 0, costByCategory: {} });

  const tripByCategory: Record<string, number> = {};
  let tripTotalCents = 0;

  for (const e of expenses) {
    tripTotalCents += e.amountCents;
    tripByCategory[e.category] = (tripByCategory[e.category] ?? 0) + e.amountCents;
    ensure(e.paidBy).paidCents += e.amountCents;
    for (const s of e.shares) {
      const u = ensure(s.userId);
      u.costCents += s.shareCents;
      u.costByCategory[e.category] = (u.costByCategory[e.category] ?? 0) + s.shareCents;
    }
  }
  return { tripTotalCents, tripByCategory, byUser };
}
