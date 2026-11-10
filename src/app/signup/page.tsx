import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { MAX_USERS } from "@/lib/constants";
import { listUsers } from "@/lib/repo";
import { getCurrentUser } from "@/lib/session";
import { SignupForm } from "./SignupForm";

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/");
  const count = (await listUsers(db)).length;

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">Join the trip</h1>
        <p className="mt-1 text-sm text-slate-500">
          {count}/{MAX_USERS} people so far. No password needed.
        </p>
      </div>
      {count >= MAX_USERS ? (
        <p className="rounded-lg bg-white p-4 text-center text-sm text-slate-600 shadow-sm">
          This trip is full. Ask someone to log you in with an existing name.
        </p>
      ) : (
        <SignupForm />
      )}
      <Link href="/login" className="text-center text-sm font-medium text-teal-700 hover:underline">
        ← Back to log in
      </Link>
    </main>
  );
}
