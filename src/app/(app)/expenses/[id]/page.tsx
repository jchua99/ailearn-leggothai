import { notFound } from "next/navigation";
import { db } from "@/db";
import { centsToInput } from "@/lib/money";
import { getExpense, getUser, listItineraryWithAttendees, listUsers } from "@/lib/repo";
import { requireUserAndTrip } from "@/lib/session";
import { toMiniUser } from "@/lib/users";
import { PageHeader } from "@/components/ui";
import { ExpenseForm } from "../ExpenseForm";

export default async function EditExpensePage({ params }: PageProps<"/expenses/[id]">) {
  const { trip } = await requireUserAndTrip();
  const id = Number((await params).id);
  const expense = Number.isInteger(id) ? await getExpense(db, id) : null;
  if (!expense) notFound();
  const [users, items, creator] = await Promise.all([
    listUsers(db),
    listItineraryWithAttendees(db),
    getUser(db, expense.createdBy),
  ]);

  return (
    <>
      <PageHeader title="Edit expense" subtitle={`Logged by ${creator?.username ?? "someone"}`} />
      <main className="mx-auto max-w-2xl px-4 py-4">
        <ExpenseForm
          currency={trip.currency}
          users={users.map(toMiniUser)}
          items={items.map((i) => ({ id: i.id, title: i.title, date: i.date, startTime: i.startTime, category: i.category }))}
          initial={{
            id: expense.id,
            amount: centsToInput(expense.amountCents),
            description: expense.description,
            category: expense.category,
            spentDate: expense.spentDate,
            spentTime: expense.spentTime,
            paidBy: expense.paidBy,
            splitType: expense.splitType,
            // A personal expense switched to "split" starts with everyone ticked.
            splitUserIds:
              expense.splitType === "equal" ? expense.shares.map((s) => s.userId) : users.map((u) => u.id),
            itemId: expense.itemId,
          }}
        />
      </main>
    </>
  );
}
