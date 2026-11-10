# LeggoThai 🇹🇭

A shared trip planner for up to 10 friends: a group itinerary that highlights what's happening
**right now**, expense logging, equal cost splitting, and a "who owes whom" settle-up list.

Scope and decisions live in [`docs/SPEC.md`](docs/SPEC.md).

## Run it locally

```bash
npm install
npm run db:push      # create the local SQLite database (local.db)
npm run seed         # optional: load a sample Thailand trip (5 people)
npm run dev          # http://localhost:3000
```

- `npm run seed -- --force` wipes everything and reloads the sample trip.
- To start completely fresh, delete `local.db` and run `npm run db:push` again.
  The first person to sign up sets up the trip.

### Using it from phones on the same Wi-Fi

```bash
npm run build && npx next start -H 0.0.0.0
```

Then open `http://<your-laptop-ip>:3000` on each phone (find the IP with `ipconfig getifaddr en0` on macOS).

## Scripts

| Command             | What it does                                     |
| ------------------- | ------------------------------------------------ |
| `npm run dev`       | Dev server with hot reload                       |
| `npm test`          | Unit tests (splits, balances, settle-up, "now")  |
| `npm run typecheck` | TypeScript check                                 |
| `npm run lint`      | ESLint                                           |
| `npm run db:push`   | Apply `src/db/schema.ts` to the database         |
| `npm run seed`      | Load sample data                                 |

## How it's built

- **Next.js 16** (App Router, Server Actions) + TypeScript + Tailwind.
- **Drizzle ORM + libSQL**: a plain SQLite file locally.
- Login is passwordless: pick your name or sign up with a username. A cookie remembers you.

```
src/
  app/
    login/ signup/ setup/     # public pages
    (app)/                    # logged-in pages with bottom tab bar
      page.tsx                # Itinerary (home) + ItineraryList "happening now" client component
      itinerary/              # add / edit item
      expenses/               # list, add / edit expense
      balances/               # spending, net balances, settle-up
      settings/               # trip settings, rename, log out
    actions.ts                # all Server Actions (form handlers)
  db/                         # Drizzle schema + client
  lib/
    money.ts                  # cents parsing, equal split, balances, settle-up  (tested)
    schedule.ts, time.ts      # "happening now" / "up next" in trip time zone   (tested)
    validation.ts             # form parsing
    repo.ts                   # data access (framework-free; reused by the seed script)
    session.ts                # cookie login
scripts/seed.ts
```

## Hosting later

The database layer is libSQL, so moving to a hosted database needs **no code changes**:

1. Create a free database on [Turso](https://turso.tech) and get its URL and auth token.
2. Set the env vars `DATABASE_URL=libsql://…` and `DATABASE_AUTH_TOKEN=…`, then run `npm run db:push`.
3. Deploy to Vercel (import the GitHub repo and add the same two env vars).

A local SQLite file will **not** work on Vercel (its servers have no persistent disk), so step 1 is required.

> Login has no passwords by design. Anyone with the URL can pick any name, so only share the link with the group.
