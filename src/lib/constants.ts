export const MAX_USERS = 10;

export const USER_COLORS = [
  "#e11d48", // rose
  "#2563eb", // blue
  "#16a34a", // green
  "#d97706", // amber
  "#7c3aed", // violet
  "#0891b2", // cyan
  "#db2777", // pink
  "#65a30d", // lime
  "#ea580c", // orange
  "#475569", // slate
];

export const ITINERARY_CATEGORIES = ["flight", "stay", "food", "activity", "transport", "other"] as const;
export type ItineraryCategory = (typeof ITINERARY_CATEGORIES)[number];

export const EXPENSE_CATEGORIES = ["food", "transport", "stay", "activity", "shopping", "other"] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const CATEGORY_ICONS: Record<string, string> = {
  flight: "✈️",
  stay: "🏨",
  food: "🍜",
  activity: "🎟️",
  transport: "🚕",
  shopping: "🛍️",
  other: "📌",
};

/** Itinerary category → closest expense category, used when linking an expense to an item. */
export function expenseCategoryFor(itineraryCategory: string): ExpenseCategory {
  if (itineraryCategory === "flight") return "transport";
  return (EXPENSE_CATEGORIES as readonly string[]).includes(itineraryCategory)
    ? (itineraryCategory as ExpenseCategory)
    : "other";
}
