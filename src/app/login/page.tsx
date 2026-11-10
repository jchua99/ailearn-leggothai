import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { MAX_USERS } from "@/lib/constants";
import { getTrip, listUsers } from "@/lib/repo";
import { getCurrentUser } from "@/lib/session";
import { secondaryButton } from "@/components/ui";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  const [users, trip] = await Promise.all([listUsers(db), getTrip(db)]);
  const full = users.length >= MAX_USERS;

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <div className="text-5xl" aria-hidden>🇹🇭</div>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">{trip?.name ?? "LeggoThai"}</h1>
        <p className="mt-1 text-sm text-slate-500">Who’s this?</p>
      </div>

      {users.length > 0 ? (
        <LoginForm users={users.map((u) => ({ id: u.id, username: u.username }))} />
      ) : (
        <p className="rounded-lg bg-white p-4 text-center text-sm text-slate-600 shadow-sm">
          No one has joined yet. Sign up to get the trip started.
        </p>
      )}

      <div className="text-center">
        {full ? (
          <p className="text-sm text-slate-500">This trip is full ({MAX_USERS}/{MAX_USERS} people).</p>
        ) : (
          <>
            <p className="mb-2 text-sm text-slate-500">Not on the list?</p>
            <Link href="/signup" className={`${secondaryButton} w-full`}>
              Sign up
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
