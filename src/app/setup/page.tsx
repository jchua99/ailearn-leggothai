import { redirect } from "next/navigation";
import { db } from "@/db";
import { getTrip } from "@/lib/repo";
import { requireUser } from "@/lib/session";
import { TripForm } from "@/components/TripForm";

export default async function SetupPage() {
  const user = await requireUser();
  if (await getTrip(db)) redirect("/");

  return (
    <main className="mx-auto max-w-sm px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Set up the trip</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500">
        Hi {user.username}! You’re first in, so tell us about the trip. Anyone can change this later in Settings.
      </p>
      <TripForm trip={null} fromSetup timeZones={Intl.supportedValuesOf("timeZone")} />
    </main>
  );
}
