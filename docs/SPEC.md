# LeggoThai — Trip Planner Spec

Agreed via a grilling session on 2026-11-10. This is the source of truth for v1 scope.

## Shape

- **One trip**, up to **10 users**.
- Built and run **locally** (Next.js + SQLite file). Code is written so it can be hosted later
  (see README → "Hosting later").
- **Phone-first** layout; works on desktop with a wider view.
- Bottom tab bar: **Itinerary** (home) · **Expenses** · **Balances** · **Settings**.

## Users & login

- No passwords. The login page has a **dropdown of existing users**; pick yourself and log in.
- A **Sign up** button registers a new user with a **username only** (2–20 chars, unique,
  case-insensitive). After sign-up you are logged in.
- Sign-up is refused once **10 users** exist.
- Each user is auto-assigned a colour.
- Login is remembered on the device (cookie) until **Log out**.
- Users can **rename themselves**. Users **cannot be deleted** in v1 (would corrupt balances).
- Trust model: anyone can pick anyone's name. This is deliberate.

## Trip settings

- Trip name, start date, end date, **time zone** (e.g. `Asia/Bangkok`), **currency** (e.g. `THB`).
- Set up once by the first person to log in; editable by anyone afterwards.

## Itinerary

- One shared itinerary. Each item is either for **everyone** or **tagged to specific people**.
- Fields: date, optional start time, optional end time, title, category
  (flight, stay, food, activity, transport, other), location (text), optional map link, notes.
- Anyone can add/edit/delete any item; items show who created them.
- Home page shows **all items grouped by day, sorted by time**, with an **All / Mine** toggle
  (Mine = items for everyone + items tagged to me).
- Items with no start time are **all-day** items, listed at the top of their day.

### "Happening now"

- Times are trip-local wall-clock times; "now" is computed in the **trip time zone**, regardless of
  the phone's own time zone.
- A timed item is **current** from its start until its end time. With no end time, it lasts until
  the next timed item starts, capped at the end of its day. An end time earlier than the start
  means it ends the next day (overnight).
- Overlapping current items are all highlighted. The next item to start gets an **Up next** badge.
- The page scrolls to the current (or next) item on open and refreshes the highlight every minute.

## Expenses

- Fields: amount, description, category (food, transport, stay, activity, shopping, other),
  date & time (default now), **paid by** (default me), optional linked itinerary item
  (pre-fills description and category).
- Split type: **Personal** (not split; counts only toward the payer) or **Split equally** among
  ticked people (default everyone).
- No uneven splits in v1. **One currency** per trip, no conversion.
- Anyone can log/edit/delete any expense; shows who logged it.
- Money is stored as integer cents. On uneven division the leftover cents go to the first people in
  the split, so shares always sum to the total.

## Balances

- **Spending** per person: what they **paid**, and what they **cost** (personal + their shares),
  plus category breakdown and trip total.
- **Net balance** per person (paid − cost, adjusted for settlements).
- **Settle-up list**: minimal set of "A pays B ฿X" transfers.
- **Mark settled** records a repayment (which changes balances). Repayments can be undone.

## Engineering

- Next.js (App Router) + TypeScript + Tailwind; Drizzle ORM + libSQL (SQLite file locally).
- Vitest unit tests for split, balances, settle-up and "happening now" logic. UI checked manually.
- `npm run seed` loads a sample Thailand trip.
