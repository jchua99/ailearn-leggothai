import { db } from "@/db";
import { listItineraryWithAttendees, listUsers } from "@/lib/repo";
import { requireUserAndTrip } from "@/lib/session";
import { nowInTimeZone } from "@/lib/time";
import { PageHeader } from "@/components/ui";
import { ExpenseForm } from "../ExpenseForm";

export default async function NewExpensePage() {
  const { user, trip } = await requireUserAndTrip();
  const [users, items] = await Promise.all([listUsers(db), listItineraryWithAttendees(db)]);
  const now = nowInTimeZone(trip.timezone);

  return (
    <>
      <PageHeader title="Add expense" />
      <main className="mx-auto max-w-2xl px-4 py-4">
        <ExpenseForm
          currency={trip.currency}
          users={users.map((u) => ({ id: u.id, username: u.username, color: u.color }))}
          items={items.map((i) => ({ id: i.id, title: i.title, date: i.date, startTime: i.startTime, category: i.category }))}
          initial={{
            amount: "",
            description: "",
            category: "food",
            spentDate: now.date,
            spentTime: now.time,
            paidBy: user.id,
            splitType: "equal",
            splitUserIds: users.map((u) => u.id),
            itemId: null,
          }}
        />
      </main>
    </>
  );
}
