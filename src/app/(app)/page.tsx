import Link from "next/link";
import { db } from "@/db";
import { listItineraryWithAttendees, listUsers } from "@/lib/repo";
import { requireUserAndTrip } from "@/lib/session";
import { toMiniUser } from "@/lib/users";
import { formatDate, nowInTimeZone, toMinutes } from "@/lib/time";
import { PageHeader, primaryButton, SegmentedTabs } from "@/components/ui";
import { ItineraryList } from "./ItineraryList";

export default async function ItineraryPage({ searchParams }: PageProps<"/">) {
  const { user, trip } = await requireUserAndTrip();
  const view = (await searchParams).view === "mine" ? "mine" : "all";
  const [items, users] = await Promise.all([listItineraryWithAttendees(db), listUsers(db)]);

  const visible =
    view === "mine" ? items.filter((i) => i.forEveryone || i.attendeeIds.includes(user.id)) : items;
  const now = nowInTimeZone(trip.timezone);

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
        <div className="mb-4">
          <SegmentedTabs
            value={view}
            tabs={[
              { value: "all", label: "All", href: "/" },
              { value: "mine", label: "Mine", href: "/?view=mine" },
            ]}
          />
        </div>
        <ItineraryList
          items={visible}
          users={users.map(toMiniUser)}
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
