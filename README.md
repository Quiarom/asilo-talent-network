# Asilo Builders

[builders.asilodigital.com](https://builders.asilodigital.com) — the meeting point
of Venezuela's builder community: who we are, how to join, and a directory of the
projects members are building.

## Stack

- **Astro 7** (SSR) deployed on **Vercel**
- **Google Sheets** (private) — project submissions and moderation (`SI` / `NO` / `PENDIENTE`)
- **Appwrite** — logo storage, likes and comments (TablesDB)
- **Cloudflare Turnstile** — captcha on public forms
- Plain CSS with design tokens — see [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md)

## Run it locally

```sh
pnpm install
DEMO_DATA=1 pnpm dev        # fictional projects + in-memory likes/comments, no credentials
```

With real data, copy `.env.example` to `.env.local` and fill it in. Without
credentials the site still runs: the directory shows placeholder cards and
likes/comments are hidden.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Dev server |
| `pnpm check` | Type-check (`astro check`) |
| `pnpm test` | Unit and component tests (Vitest). Never touches real services. |
| `pnpm test:e2e` | Browser tests (Playwright) against `DEMO_DATA=1` |
| `pnpm build` | Production build |

## How the directory works

- Each sheet row is an immutable **revision**. A project is identified by its
  normalized website; the **latest approved** revision is what the site shows.
- **New projects** and **edit requests** ("Solicita cambios" on a project page)
  both append a `PENDIENTE` row. Approving = setting it to `SI`. Edit requests
  carry the requester's contact in *Notas adicionales*.
- **Comments** are stored as `pending` in Appwrite and only `approved` ones are
  shown. Until there is a back office, moderate them in the Appwrite console
  (`builders` → `project_comments` → `status`).
- Likes and comments need the Appwrite tables: `node scripts/setup-appwrite.mjs`.

## Layout

```
src/
  pages/            routes: home, /proyectos/[slug], partials, /api/*
  layouts/          BaseLayout (head, header, footer)
  components/       directory, card, like button, submit/edit modal
  lib/              domain logic (pure) and adapters (Sheets, Appwrite)
  lib/engagement/   likes & comments port + Appwrite / memory adapters
  scripts/          browser scripts (ASCII background, reveal, likes)
  styles/           tokens + components
tests/              Vitest
e2e/                Playwright
```
