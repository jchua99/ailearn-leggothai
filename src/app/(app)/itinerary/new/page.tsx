import { db } from "@/db";
import { listUsers } from "@/lib/repo";
import { requireUserAndTrip } from "@/lib/session";
import { nowInTimeZone } from "@/lib/time";
import { PageHeader } from "@/components/ui";
import { ItemForm } from "../ItemForm";

export default async function NewItemPage() {
  const { user, trip } = await requireUserAndTrip();
  const users = await listUsers(db);
  const today = nowInTimeZone(trip.timezone).date;
  // Default to today if we're mid-trip, otherwise the first trip day.
  const date = today >= trip.startDate && today <= trip.endDate ? today : trip.startDate;

  return (
    <>
      <PageHeader title="Add to itinerary" />
      <main className="mx-auto max-w-2xl px-4 py-4">
        <ItemForm
          users={users.map((u) => ({ id: u.id, username: u.username, color: u.color }))}
          currentUserId={user.id}
          initial={{
            date,
            startTime: null,
            endTime: null,
            title: "",
            category: "activity",
            location: null,
            mapUrl: null,
            notes: null,
            forEveryone: true,
            attendeeIds: [],
          }}
        />
      </main>
    </>
  );
}
