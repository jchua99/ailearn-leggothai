import Link from "next/link";
import { db } from "@/db";
import { listItineraryWithAttendees, listUsers } from "@/lib/repo";
import { requireUserAndTrip } from "@/lib/session";
import { formatDate, nowInTimeZone, toMinutes } from "@/lib/time";
import { PageHeader, primaryButton } from "@/components/ui";
import { ItineraryList } from "./ItineraryList";

export default async function ItineraryPage({ searchParams }: PageProps<"/">) {
  const { user, trip } = await requireUserAndTrip();
  const view = (await searchParams).view === "mine" ? "mine" : "all";
  const [items, users] = await Promise.all([listItineraryWithAttendees(db), listUsers(db)]);

  const visible =
    view === "mine" ? items.filter((i) => i.forEveryone || i.attendeeIds.includes(user.id)) : items;
  const now = nowInTimeZone(trip.timezone);

  const tab = (v: "all" | "mine", label: string) => (
    <Link
      href={v === "all" ? "/" : "/?view=mine"}
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
        title={trip.name}
        subtitle={`${formatDate(trip.startDate)} – ${formatDate(trip.endDate)} · ${trip.timezone}`}
        action={
          <Link href="/itinerary/new" className={primaryButton}>
            + Add
          </Link>
        }
      />
      <main className="mx-auto max-w-2xl px-4 py-4">
        <div className="mb-4 flex rounded-lg bg-slate-200/70 p-1">
          {tab("all", "All")}
          {tab("mine", "Mine")}
        </div>
        <ItineraryList
          items={visible}
          users={users.map((u) => ({ id: u.id, username: u.username, color: u.color }))}
          currentUserId={user.id}
          timeZone={trip.timezone}
          tripStart={trip.startDate}
          tripEnd={trip.endDate}
          initialNow={{ ...now, minutes: toMinutes(now.date, now.time) }}
        />
      </main>
    </>
  );
}
