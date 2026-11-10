import { db } from "@/db";
import { logoutAction } from "@/app/actions";
import { MAX_USERS } from "@/lib/constants";
import { listUsers } from "@/lib/repo";
import { requireUserAndTrip } from "@/lib/session";
import { TripForm } from "@/components/TripForm";
import { Card, PageHeader, secondaryButton, UserChip } from "@/components/ui";
import { RenameForm } from "./RenameForm";

export default async function SettingsPage() {
  const { user, trip } = await requireUserAndTrip();
  const users = await listUsers(db);

  return (
    <>
      <PageHeader title="Settings" subtitle={`Logged in as ${user.username}`} />
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-4">
        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">You</h2>
          <Card className="space-y-4">
            <RenameForm username={user.username} />
            <form action={logoutAction}>
              <button type="submit" className={`${secondaryButton} w-full`}>
                Log out
              </button>
            </form>
          </Card>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            People ({users.length}/{MAX_USERS})
          </h2>
          <Card className="flex flex-wrap gap-2">
            {users.map((u) => (
              <UserChip key={u.id} user={u} you={u.id === user.id} />
            ))}
          </Card>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Trip</h2>
          <Card>
            <TripForm trip={trip} timeZones={Intl.supportedValuesOf("timeZone")} />
          </Card>
        </section>
      </main>
    </>
  );
}
