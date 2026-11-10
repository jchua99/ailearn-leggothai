import { describe, expect, it } from "vitest";
import {
  computeBalances,
  maxRepayment,
  parseAmountToCents,
  spendingSummary,
  splitEqually,
  suggestSettlements,
} from "./money";

describe("parseAmountToCents", () => {
  it("parses whole and decimal amounts", () => {
    expect(parseAmountToCents("100")).toBe(10000);
    expect(parseAmountToCents("12.5")).toBe(1250);
    expect(parseAmountToCents("12.34")).toBe(1234);
    expect(parseAmountToCents("1,200")).toBe(120000);
    expect(parseAmountToCents("1,234,567.89")).toBe(123456789);
    expect(parseAmountToCents(" 0.01 ")).toBe(1);
  });

  it("rejects invalid, zero and negative amounts", () => {
    expect(parseAmountToCents("")).toBeNull();
    expect(parseAmountToCents("abc")).toBeNull();
    expect(parseAmountToCents("0")).toBeNull();
    expect(parseAmountToCents("-5")).toBeNull();
    expect(parseAmountToCents("1.234")).toBeNull();
  });

  it("rejects misplaced commas", () => {
    expect(parseAmountToCents("1,2,3")).toBeNull();
    expect(parseAmountToCents("1,,000")).toBeNull();
    expect(parseAmountToCents("1,50")).toBeNull();
    expect(parseAmountToCents(",100")).toBeNull();
    expect(parseAmountToCents("1000,")).toBeNull();
  });
});

describe("splitEqually", () => {
  it("splits evenly when divisible", () => {
    expect(splitEqually(900, [1, 2, 3])).toEqual([
      { userId: 1, shareCents: 300 },
      { userId: 2, shareCents: 300 },
      { userId: 3, shareCents: 300 },
    ]);
  });

  it("gives leftover cents to the first people so shares sum to the total", () => {
    const shares = splitEqually(10000, [1, 2, 3]);
    expect(shares.map((s) => s.shareCents)).toEqual([3334, 3333, 3333]);
    expect(shares.reduce((a, s) => a + s.shareCents, 0)).toBe(10000);
  });

  it("puts the whole amount on one person", () => {
    expect(splitEqually(123, [7])).toEqual([{ userId: 7, shareCents: 123 }]);
  });

  it("throws on an empty split", () => {
    expect(() => splitEqually(100, [])).toThrow();
  });
});

describe("computeBalances", () => {
  it("credits the payer and debits each share", () => {
    const balances = computeBalances(
      [1, 2, 3],
      [
        {
          paidBy: 1,
          amountCents: 900,
          shares: splitEqually(900, [1, 2, 3]),
        },
      ],
      [],
    );
    expect(balances).toEqual({ 1: 600, 2: -300, 3: -300 });
  });

  it("personal expenses don't change balances", () => {
    const balances = computeBalances(
      [1, 2],
      [{ paidBy: 1, amountCents: 500, shares: [{ userId: 1, shareCents: 500 }] }],
      [],
    );
    expect(balances).toEqual({ 1: 0, 2: 0 });
  });

  it("settlements move money from debtor to creditor", () => {
    const balances = computeBalances(
      [1, 2],
      [{ paidBy: 1, amountCents: 1000, shares: splitEqually(1000, [1, 2]) }],
      [{ fromUserId: 2, toUserId: 1, amountCents: 500 }],
    );
    expect(balances).toEqual({ 1: 0, 2: 0 });
  });
});

describe("suggestSettlements", () => {
  it("returns nothing when everyone is even", () => {
    expect(suggestSettlements({ 1: 0, 2: 0 })).toEqual([]);
  });

  it("produces transfers that zero out all balances", () => {
    const balances = { 1: 1500, 2: -1000, 3: -700, 4: 200 };
    const transfers = suggestSettlements(balances);
    const after: Record<number, number> = { ...balances };
    for (const t of transfers) {
      after[t.fromUserId] += t.amountCents;
      after[t.toUserId] -= t.amountCents;
      expect(t.amountCents).toBeGreaterThan(0);
    }
    expect(Object.values(after).every((v) => v === 0)).toBe(true);
    expect(transfers.length).toBeLessThanOrEqual(3);
  });

  it("pairs a single debtor with a single creditor", () => {
    expect(suggestSettlements({ 1: 300, 2: -300 })).toEqual([
      { fromUserId: 2, toUserId: 1, amountCents: 300 },
    ]);
  });
});

describe("maxRepayment", () => {
  it("is the smaller of the debt and the credit", () => {
    expect(maxRepayment({ 1: 300, 2: -500, 3: 200 }, 2, 1)).toBe(300);
    expect(maxRepayment({ 1: 800, 2: -500 }, 2, 1)).toBe(500);
  });

  it("is 0 once the debt is settled, so a repeat 'Mark settled' can't reverse it", () => {
    const after = computeBalances(
      [1, 2],
      [{ paidBy: 1, amountCents: 1000, shares: splitEqually(1000, [1, 2]) }],
      [{ fromUserId: 2, toUserId: 1, amountCents: 500 }],
    );
    expect(maxRepayment(after, 2, 1)).toBe(0);
  });

  it("is 0 when the direction is wrong", () => {
    expect(maxRepayment({ 1: 300, 2: -300 }, 1, 2)).toBe(0);
  });
});

describe("spendingSummary", () => {
  it("separates what people paid from what they cost", () => {
    const summary = spendingSummary(
      [1, 2],
      [
        {
          paidBy: 1,
          amountCents: 1000,
          category: "food",
          shares: splitEqually(1000, [1, 2]),
        },
        {
          paidBy: 2,
          amountCents: 300,
          category: "shopping",
          shares: [{ userId: 2, shareCents: 300 }],
        },
      ],
    );
    expect(summary.tripTotalCents).toBe(1300);
    expect(summary.byUser[1]).toEqual({
      paidCents: 1000,
      costCents: 500,
      costByCategory: { food: 500 },
    });
    expect(summary.byUser[2]).toEqual({
      paidCents: 300,
      costCents: 800,
      costByCategory: { food: 500, shopping: 300 },
    });
    expect(summary.tripByCategory).toEqual({ food: 1000, shopping: 300 });
  });
});
