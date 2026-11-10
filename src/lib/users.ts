import type { User } from "@/db/schema";

/** The slice of a user that client components need (name + colour dot). */
export type MiniUser = Pick<User, "id" | "username" | "color">;

export function toMiniUser({ id, username, color }: MiniUser): MiniUser {
  return { id, username, color };
}
