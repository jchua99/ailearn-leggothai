import { notFound } from "next/navigation";
import { db } from "@/db";
import { getItineraryItem, getUser, listUsers } from "@/lib/repo";
import { requireUserAndTrip } from "@/lib/session";
import { toMiniUser } from "@/lib/users";
import { PageHeader } from "@/components/ui";
import { ItemForm } from "../ItemForm";

export default async function EditItemPage({ params }: PageProps<"/itinerary/[id]">) {
  const { user } = await requireUserAndTrip();
  const id = Number((await params).id);
  const item = Number.isInteger(id) ? await getItineraryItem(db, id) : null;
  if (!item) notFound();
  const [users, creator] = await Promise.all([listUsers(db), getUser(db, item.createdBy)]);

  return (
    <>
      <PageHeader title="Edit itinerary item" subtitle={`Added by ${creator?.username ?? "someone"}`} />
      <main className="mx-auto max-w-2xl px-4 py-4">
        <ItemForm
          users={users.map(toMiniUser)}
          currentUserId={user.id}
          initial={item}
        />
      </main>
    </>
  );
}
