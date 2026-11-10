import Link from "next/link";
import { db } from "@/db";
import { CATEGORY_ICONS } from "@/lib/constants";
import { formatMoney, spendingSummary } from "@/lib/money";
import { listExpensesWithShares, listItineraryWithAttendees, listUsers } from "@/lib/repo";
import { requireUserAndTrip } from "@/lib/session";
import { formatDayLabel } from "@/lib/time";
import { Card, PageHeader, primaryButton } from "@/components/ui";

export default async function ExpensesPage({ searchParams }: PageProps<"/expenses">) {
  const { user, trip } = await requireUserAndTrip();
  const view = (await searchParams).view === "mine" ? "mine" : "all";
  const [allExpenses, users, items] = await Promise.all([
    listExpensesWithShares(db),
    listUsers(db),
    listItineraryWithAttendees(db),
  ]);
  const userById = new Map(users.map((u) => [u.id, u]));
  const itemById = new Map(items.map((i) => [i.id, i]));
  const money = (c: number) => formatMoney(c, trip.currency);

  const summary = spendingSummary(users.map((u) => u.id), allExpenses);
  const mine = summary.byUser[user.id] ?? { paidCents: 0, costCents: 0 };

  const expenses =
    view === "mine"
      ? allExpenses.filter((e) => e.paidBy === user.id || e.shares.some((s) => s.userId === user.id))
      : allExpenses;
  const dates = [...new Set(expenses.map((e) => e.spentDate))];

  const tab = (v: "all" | "mine", label: string) => (
    <Link
      href={v === "all" ? "/expenses" : "/expenses?view=mine"}
      aria-current={view === v ? "page" : undefined}
      className={`flex-1 rounded-md px-3 py-1.5 text-center text-sm font-medium ${
        view === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle={`Trip total ${money(summary.tripTotalCents)}`}
        action={
          <Link href="/expenses/new" className={primaryButton}>
            + Add
          </Link>
        }
      />
      <main className="mx-auto max-w-2xl space-y-4 px-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <p className="text-xs font-medium text-slate-500">You paid</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{money(mine.paidCents)}</p>
          </Card>
          <Card>
            <p className="text-xs font-medium text-slate-500">Your spending</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{money(mine.costCents)}</p>
            <p className="text-[11px] text-slate-400">personal + your shares</p>
          </Card>
        </div>

        <div className="flex rounded-lg bg-slate-200/70 p-1">
          {tab("all", "All")}
          {tab("mine", "Involving me")}
        </div>

        {expenses.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-500">No expenses yet. Tap “+ Add” to log one.</p>
        )}

        {dates.map((date) => (
          <section key={date}>
            <h2 className="mb-2 text-sm font-semibold text-slate-700">{formatDayLabel(date)}</h2>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {expenses
                .filter((e) => e.spentDate === date)
                .map((e) => {
                  const payer = userById.get(e.paidBy);
                  const myShare = e.shares.find((s) => s.userId === user.id)?.shareCents;
                  const item = e.itemId ? itemById.get(e.itemId) : null;
                  return (
                    <li key={e.id}>
                      <Link href={`/expenses/${e.id}`} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50">
                        <span className="text-xl" aria-hidden>
                          {CATEGORY_ICONS[e.category] ?? "📌"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-slate-900">{e.description}</p>
                          <p className="text-xs text-slate-500">
                            {e.spentTime} · {payer?.id === user.id ? "You" : payer?.username} paid ·{" "}
                            {e.splitType === "personal" ? "personal" : `split ${e.shares.length} way${e.shares.length > 1 ? "s" : ""}`}
                          </p>
                          {item && <p className="truncate text-xs text-teal-700">🔗 {item.title}</p>}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">{money(e.amountCents)}</p>
                          {myShare !== undefined && e.splitType === "equal" && (
                            <p className="text-xs text-slate-500">you: {money(myShare)}</p>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </section>
        ))}
      </main>
    </>
  );
}
