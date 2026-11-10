import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { getTrip, getUser } from "./repo";

/**
 * Passwordless "pick your name" login (see docs/SPEC.md → trust model).
 * The cookie just holds the user id; anyone could pick anyone, by design.
 */
const COOKIE = "leggothai_uid";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function getCurrentUser() {
  const raw = (await cookies()).get(COOKIE)?.value;
  const id = Number(raw);
  if (!raw || !Number.isInteger(id)) return null;
  return getUser(db, id);
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** For pages inside the app: must be logged in and the trip must be set up. */
export async function requireUserAndTrip() {
  const user = await requireUser();
  const trip = await getTrip(db);
  if (!trip) redirect("/setup");
  return { user, trip };
}

export async function startSession(userId: number) {
  (await cookies()).set(COOKIE, String(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}
