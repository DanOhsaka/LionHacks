# PridePath

**PridePath** (“Study smarter, play harder”) is an AI-assisted learning web app: learners upload documents, the app builds structured checkpoints, and they practice in game-like modes with progress, analytics, achievements, and wellness tooling.

This package is a **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS** project. Auth and persistence use **Supabase** (PostgreSQL + Row Level Security). Optional AI features use the **Mistral** API (curriculum generation, explanations, wellness chat, analytics insights).

---

## Features (high level)

| Area | What it does |
|------|----------------|
| **Landing** | Marketing home with optional full-screen **particle logo** intro (`/pridepath-lion.png`) before sign-in. |
| **Auth** | Email/password sign-up and login via Supabase. |
| **Dashboard** | Overview of courses, recent sessions, streaks, and links into analytics. |
| **Courses** | Library of uploaded courses; open a course for detail and **play** sessions. |
| **Play** | Checkpoint game flow (e.g. Speed / Zen / Story style practice) with session recap. |
| **Upload** | Upload materials to create or extend courses (Mistral-powered parsing when API key is set). |
| **Analytics** | Session trends and exports; may require DB migrations for newer columns (e.g. `sessions.wrong_count`). |
| **Achievements** | Unlockable milestones with optional notification badge in the nav. |
| **Wellness** | Mood and wellness tracking plus **Roomie** coach entry point (floating bubble). |

Protected app routes are enforced in **`src/middleware.ts`** (redirect to `/login` when there is no session) and again in the dashboard layout via **`supabase.auth.getUser()`**.

---

## Prerequisites

- **Node.js 20+** (LTS recommended)
- A **Supabase** project (URL + anon key; optional service role for certain signup flows—see `.env.example`)

---

## Environment variables

Copy **`learnpulse/.env.example`** to **`learnpulse/.env.local`** and fill in values.

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Server-only; useful when email confirmation leaves signup without a client session |
| `MISTRAL_API_KEY` | No | Course curriculum / chat / insights when enabled |
| `MISTRAL_MODEL` | No | Defaults to `mistral-small-latest` if unset |

Never commit **`.env.local`** or the service role key.

---

## Database

SQL migrations live in **`supabase/migrations/`**. Apply them to your Supabase project (SQL editor or Supabase CLI) so the schema matches **`supabase/schema.sql`**.

If the UI references a column your database does not have yet (for example analytics and `wrong_count` on `sessions`), run the corresponding migration or align `schema.sql` with your remote DB.

---

## Scripts

Run commands from **`learnpulse/`** (this directory).

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start Next.js dev server (default port **3000**) |
| `npm run dev:fresh` | Clean Next output then `next dev` (helps if the build cache is corrupted) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run clean` | Removes configured Next output folder (see `next.config.mjs`) |

### Build output directory

`next.config.mjs` sets **`distDir: ".next-local"`** so the build does not use a default `.next` folder next to OneDrive-synced trees (Windows + OneDrive can break symlinks used by Next). After problems, run **`npm run clean`** and delete any stray `.next` folder if needed.

---

## Project layout (partial)

```
learnpulse/
├── src/
│   ├── app/                 # App Router: pages, layouts, API routes
│   ├── components/          # UI (dashboard, game, landing, wellness, …)
│   ├── lib/                 # Supabase clients, Mistral helpers, analytics, …
│   ├── stores/              # Client state (e.g. session store)
│   └── middleware.ts        # Session refresh + protected-route redirects
├── public/                  # Static assets (e.g. pridepath-lion.png)
├── supabase/
│   ├── migrations/          # Ordered SQL migrations
│   └── schema.sql           # Reference schema
└── .env.example
```

---

## Tech stack

- **Next.js 14** (App Router), **React 18**, **TypeScript**
- **Tailwind CSS**, **Radix UI**, **Framer Motion**, **Recharts**, **Sonner**, **Zustand**
- **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`)
- **Mistral** (`@mistralai/mistralai`) for document-backed curriculum and assistants

---

## Deploying

Build with `npm run build`, run with `npm run start`, or deploy to **Vercel** (or any Node host) with the same environment variables as production. Ensure Supabase redirect URLs and site URL match your deployment domain.

---

## License

Private / team use unless otherwise specified by the repository owners.
