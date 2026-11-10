import { sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

const createdAt = () =>
  text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`);

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull(),
  /** lower-cased username, used for case-insensitive uniqueness */
  usernameKey: text("username_key").notNull().unique(),
  color: text("color").notNull(),
  createdAt: createdAt(),
});

/** Single-row table: the one trip (id is always 1). */
export const trip = sqliteTable("trip", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  timezone: text("timezone").notNull(),
  currency: text("currency").notNull(),
});

export const itineraryItems = sqliteTable("itinerary_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // YYYY-MM-DD, trip-local
  startTime: text("start_time"), // HH:MM, null = all day
  endTime: text("end_time"),
  title: text("title").notNull(),
  category: text("category").notNull(),
  location: text("location"),
  mapUrl: text("map_url"),
  notes: text("notes"),
  /** true = for everyone; false = only the users in itinerary_attendees */
  forEveryone: integer("for_everyone", { mode: "boolean" }).notNull().default(true),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: createdAt(),
});

export const itineraryAttendees = sqliteTable(
  "itinerary_attendees",
  {
    itemId: integer("item_id")
      .notNull()
      .references(() => itineraryItems.id),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
  },
  (t) => [primaryKey({ columns: [t.itemId, t.userId] })],
);

export const expenses = sqliteTable("expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  description: text("description").notNull(),
  amountCents: integer("amount_cents").notNull(),
  category: text("category").notNull(),
  spentDate: text("spent_date").notNull(), // YYYY-MM-DD, trip-local
  spentTime: text("spent_time").notNull(), // HH:MM
  paidBy: integer("paid_by")
    .notNull()
    .references(() => users.id),
  splitType: text("split_type", { enum: ["personal", "equal"] }).notNull(),
  itemId: integer("item_id").references(() => itineraryItems.id),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: createdAt(),
});

/** Each person's share of an expense. Personal expenses have one row: the payer, full amount. */
export const expenseShares = sqliteTable(
  "expense_shares",
  {
    expenseId: integer("expense_id")
      .notNull()
      .references(() => expenses.id),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    shareCents: integer("share_cents").notNull(),
  },
  (t) => [primaryKey({ columns: [t.expenseId, t.userId] })],
);

/** A repayment: fromUser handed amount to toUser. */
export const settlements = sqliteTable("settlements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fromUserId: integer("from_user_id")
    .notNull()
    .references(() => users.id),
  toUserId: integer("to_user_id")
    .notNull()
    .references(() => users.id),
  amountCents: integer("amount_cents").notNull(),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: createdAt(),
});

export type User = typeof users.$inferSelect;
export type Trip = typeof trip.$inferSelect;
export type ItineraryItem = typeof itineraryItems.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Settlement = typeof settlements.$inferSelect;
