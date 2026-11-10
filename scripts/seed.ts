/**
 * Loads a sample Thailand trip so you can click around.
 *   npm run seed           # refuses if there is already data
 *   npm run seed -- --force  # wipes everything first
 * Dates are relative to today (Bangkok time) so the "happening now" highlight has something to show.
 */
import { db } from "@/db";
import * as repo from "@/lib/repo";
import { nowInTimeZone } from "@/lib/time";

const TZ = "Asia/Bangkok";

function addDays(date: string, n: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const force = process.argv.includes("--force");
  const existing = await repo.listUsers(db);
  if (existing.length && !force) {
    console.error("Database already has data. Re-run with `npm run seed -- --force` to wipe it and reseed.");
    process.exit(1);
  }
  if (force) await repo.wipeAll(db);

  const today = nowInTimeZone(TZ).date;
  const d = (n: number) => addDays(today, n);

  await repo.saveTrip(db, {
    name: "Thailand Getaway",
    startDate: d(-1),
    endDate: d(3),
    timezone: TZ,
    currency: "THB",
  });

  const names = ["Jason", "Mei", "Arjun", "Priya", "Ben"];
  const ids: Record<string, number> = {};
  for (const n of names) {
    const r = await repo.createUser(db, n);
    if (!r.ok) throw new Error(r.error);
    ids[n] = r.id;
  }
  const all = names.map((n) => ids[n]);

  type Seed = Omit<repo.ItemInput, "location" | "mapUrl" | "notes" | "forEveryone" | "attendeeIds"> &
    Partial<repo.ItemInput>;
  const items: Seed[] = [
    { date: d(-1), startTime: "09:40", endTime: "11:10", title: "Flight SIN → BKK", category: "flight", location: "Changi T1" },
    { date: d(-1), startTime: "14:00", endTime: null, title: "Check in at hotel", category: "stay", location: "Sukhumvit Soi 11" },
    { date: d(-1), startTime: "19:00", endTime: "21:00", title: "Chinatown street food crawl", category: "food", location: "Yaowarat Rd" },
    { date: d(0), startTime: null, endTime: null, title: "Pack day bag + sunscreen", category: "other" },
    { date: d(0), startTime: "08:00", endTime: "09:00", title: "Breakfast at hotel", category: "food" },
    { date: d(0), startTime: "09:30", endTime: "12:30", title: "Grand Palace & Wat Pho", category: "activity", location: "Na Phra Lan Rd", mapUrl: "https://maps.google.com/?q=Grand+Palace+Bangkok", notes: "Dress code: cover shoulders and knees." },
    { date: d(0), startTime: "13:00", endTime: null, title: "Lunch at Pa Tong Go", category: "food" },
    { date: d(0), startTime: "15:00", endTime: "18:00", title: "Spa afternoon", category: "activity", forEveryone: false, attendeeIds: [ids.Mei, ids.Priya] },
    { date: d(0), startTime: "15:00", endTime: "18:00", title: "Muay Thai class", category: "activity", forEveryone: false, attendeeIds: [ids.Jason, ids.Arjun, ids.Ben] },
    { date: d(0), startTime: "19:30", endTime: "22:30", title: "Rooftop dinner", category: "food", location: "Octave Rooftop" },
    { date: d(1), startTime: "07:30", endTime: null, title: "Train to Ayutthaya", category: "transport", location: "Krung Thep Aphiwat" },
    { date: d(1), startTime: "10:00", endTime: "16:00", title: "Ayutthaya temples by bike", category: "activity" },
    { date: d(2), startTime: "10:00", endTime: "17:00", title: "Chatuchak Weekend Market", category: "activity" },
    { date: d(3), startTime: "12:00", endTime: null, title: "Check out", category: "stay" },
    { date: d(3), startTime: "16:20", endTime: "19:45", title: "Flight BKK → SIN", category: "flight" },
  ];
  const itemIds: number[] = [];
  for (const it of items) {
    itemIds.push(
      await repo.createItineraryItem(
        db,
        {
          location: null,
          mapUrl: null,
          notes: null,
          forEveryone: true,
          attendeeIds: [],
          ...it,
        },
        ids.Jason,
      ),
    );
  }

  const exp = (e: Omit<repo.ExpenseInput, "splitUserIds"> & { splitUserIds?: number[] }) =>
    repo.createExpense(db, { splitUserIds: all, ...e }, e.paidBy);

  await exp({ description: "Grab from airport", amountCents: 45000, category: "transport", spentDate: d(-1), spentTime: "11:50", paidBy: ids.Arjun, splitType: "equal", itemId: null });
  await exp({ description: "Hotel (4 nights)", amountCents: 1600000, category: "stay", spentDate: d(-1), spentTime: "14:10", paidBy: ids.Jason, splitType: "equal", itemId: itemIds[1] });
  await exp({ description: "Chinatown street food", amountCents: 128000, category: "food", spentDate: d(-1), spentTime: "20:30", paidBy: ids.Mei, splitType: "equal", itemId: itemIds[2] });
  await exp({ description: "7-Eleven snacks", amountCents: 18550, category: "food", spentDate: d(-1), spentTime: "22:05", paidBy: ids.Ben, splitType: "personal", itemId: null });
  await exp({ description: "Grand Palace tickets", amountCents: 250000, category: "activity", spentDate: d(0), spentTime: "09:35", paidBy: ids.Priya, splitType: "equal", itemId: itemIds[5] });
  await exp({ description: "Spa", amountCents: 240000, category: "activity", spentDate: d(0), spentTime: "15:00", paidBy: ids.Mei, splitType: "equal", splitUserIds: [ids.Mei, ids.Priya], itemId: itemIds[7] });
  await exp({ description: "Elephant pants", amountCents: 35000, category: "shopping", spentDate: d(0), spentTime: "12:45", paidBy: ids.Jason, splitType: "personal", itemId: null });

  await repo.createSettlement(db, { fromUserId: ids.Ben, toUserId: ids.Jason, amountCents: 100000 }, ids.Ben);

  console.log(`Seeded "Thailand Getaway" (${d(-1)} → ${d(3)}) with ${names.length} people, ${items.length} itinerary items, 7 expenses.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
