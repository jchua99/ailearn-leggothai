import { db } from "@/db";
import { recordSettlementAction, undoSettlementAction } from "@/app/actions";
import { CATEGORY_ICONS } from "@/lib/constants";
import { computeBalances, moneyFormatter, spendingSummary, suggestSettlements } from "@/lib/money";
import { listExpensesWithShares, listSettlements, listUsers } from "@/lib/repo";
import { requireUserAndTrip } from "@/lib/session";
import { Avatar, Card, PageHeader } from "@/components/ui";
import { SettleButton } from "./SettleButton";

export default async function BalancesPage() {
  const { user, trip } = await requireUserAndTrip();
  const [users, expenses, settlements] = await Promise.all([
    listUsers(db),
    listExpensesWithShares(db),
    listSettlements(db),
  ]);
  const userIds = users.map((u) => u.id);
  const userById = new Map(users.map((u) => [u.id, u]));
  const name = (id: number) => (id === user.id ? "You" : (userById.get(id)?.username ?? "Someone"));
  const money = moneyFormatter(trip.currency);

  const balances = computeBalances(userIds, expenses, settlements);
  const transfers = suggestSettlements(balances);
  const summary = spendingSummary(userIds, expenses);
  const categories = Object.entries(summary.tripByCategory).sort((a, b) => b[1] - a[1]);
  const maxCategory = categories[0]?.[1] ?? 0;

  return (
    <>
      <PageHeader title="Balances" subtitle={`Trip total ${money(summary.tripTotalCents)}`} />
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-4">
        {/* Settle up */}
        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Settle up</h2>
          {transfers.length === 0 ? (
            <Card>
              <p className="text-center text-sm text-slate-500">🎉 Everyone is square.</p>
            </Card>
          ) : (
            <ul className="space-y-2">
              {transfers.map((t) => (
                <li key={`${t.fromUserId}-${t.toUserId}`}>
                  <Card className={`flex items-center gap-3 ${t.fromUserId === user.id || t.toUserId === user.id ? "border-teal-300" : ""}`}>
                    <div className="min-w-0 flex-1 text-sm">
                      <span className="font-semibold">{name(t.fromUserId)}</span>
                      <span className="text-slate-500"> {t.fromUserId === user.id ? "pay" : "pays"} </span>
                      <span className="font-semibold">{name(t.toUserId)}</span>
                      <p className="text-lg font-bold text-slate-900">{money(t.amountCents)}</p>
                    </div>
                    <form action={recordSettlementAction.bind(null, t.fromUserId, t.toUserId, t.amountCents)}>
                      <SettleButton />
                    </form>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Per-person */}
        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Everyone</h2>
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {users.map((u) => {
              const s = summary.byUser[u.id];
              const bal = balances[u.id] ?? 0;
              return (
                <li key={u.id} className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar user={u} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">
                        {u.username} {u.id === user.id && <span className="text-xs text-slate-400">(you)</span>}
                      </p>
                      <p className="text-xs text-slate-500">
                        Paid {money(s.paidCents)} · Spent {money(s.costCents)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${bal > 0 ? "text-teal-700" : bal < 0 ? "text-red-600" : "text-slate-400"}`}>
                        {bal > 0 ? "+" : bal < 0 ? "−" : ""}
                        {money(Math.abs(bal))}
                      </p>
                      <p className="text-[11px] text-slate-400">{bal > 0 ? "is owed" : bal < 0 ? "owes" : "settled"}</p>
                    </div>
                  </div>
                  {Object.keys(s.costByCategory).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1 pl-11">
                      {Object.entries(s.costByCategory)
                        .sort((a, b) => b[1] - a[1])
                        .map(([cat, cents]) => (
                          <span key={cat} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                            {CATEGORY_ICONS[cat]} {money(cents)}
                          </span>
                        ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            <strong>Paid</strong> = money out of their pocket. <strong>Spent</strong> = personal expenses + their share of splits.
          </p>
        </section>

        {/* Trip by category */}
        {categories.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-700">Trip spending by category</h2>
            <Card className="space-y-2">
              {categories.map(([cat, cents]) => (
                <div key={cat} className="text-sm">
                  <div className="flex justify-between">
                    <span className="capitalize text-slate-700">
                      {CATEGORY_ICONS[cat]} {cat}
                    </span>
                    <span className="font-medium text-slate-900">{money(cents)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                    <div className="h-1.5 rounded-full bg-teal-600" style={{ width: `${(cents / maxCategory) * 100}%` }} />
                  </div>
                </div>
              ))}
            </Card>
          </section>
        )}

        {/* History */}
        {settlements.length > 0 && (
          <section>
            <h2 className="mb-2 text-sm font-semibold text-slate-700">Repayments recorded</h2>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {settlements.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <span className="min-w-0 flex-1">
                    {name(s.fromUserId)} → {name(s.toUserId)}{" "}
                    <span className="font-semibold">{money(s.amountCents)}</span>
                  </span>
                  <form action={undoSettlementAction.bind(null, s.id)}>
                    <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
                      Undo
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
