# AGENTS.md

## Cursor Cloud specific instructions

This is a self-contained **Astro** static site (No Man's Sky Recipes) with no database, external APIs, or Docker dependencies. All game data lives as static JSON in `src/data/` and `src/datav2/`.

### Running services

- **Dev server:** `pnpm run dev` — starts on `http://localhost:4321/`

### Standard commands

This project uses **pnpm 11+** (`packageManager` in `package.json`). See `package.json` scripts and `README.md` for the full list. Key commands:

| Task | Command |
|------|---------|
| Install | `pnpm install` |
| Lint | `pnpm run lint` |
| Type-check | `pnpm run type-check` |
| Build | `pnpm run build` |
| Dev server | `pnpm run dev` |

### Notes

- The ESLint config uses flat config format (`eslint.config.mjs`) with ESLint 9. The `lint` script uses `--ext` flags which work with the current setup.
- `pnpm-workspace.yaml` lists `allowBuilds` for `esbuild` and `sharp` (required for Astro image optimization under pnpm’s install-script policy).
- `pnpm run build` generates ~4,800+ static pages and takes ~25 seconds. This is expected.
- **Node.js:** Astro 7 requires `>=22.12.0`. Production (Vercel) uses **24.x**; `.nvmrc` is set to `24` for local parity.
- No environment variables or secrets are needed for development.

### Alliance directory (`/alliances`)

- The only on-demand pages. They use `@astrojs/vercel` with `export const prerender = false`, and every other page stays static. Static output now builds to `dist/client/`.
- Storage is SQLite through `@libsql/client`. In production it's Turso (the Vercel integration sets `SQLITE_TURSO_DATABASE_URL`/`SQLITE_TURSO_AUTH_TOKEN`, Production only). Locally it falls back to `.data/alliances.db` (gitignored).
- Submissions are `pending` until approved at `/alliances/admin/`, which is gated by `ALLIANCES_ADMIN_TOKEN` (put it in `.env.local` for dev).
- Starter listings live in `src/utils/allianceSeeds.ts`. Load them as pending with `pnpm run seed:alliances` (local) or the "Load starter listings" button on the admin page (production, because Turso's env vars are sensitive and pull as empty). `pnpm run test:alliances` checks validation.
- `src/data/galaxies.json` (all 256 galaxy names and numbers) is generated from the Fandom wiki by `pnpm run data:galaxies`. The submit form and validation use it.
- The feedback form (`/feedback`) shares the alliance styles via the `.site-form` scope in `src/assets/css/alliances.css`.
- In agent shells, Astro 7's `astro dev` tries to background itself and fails on Windows. Run `ASTRO_DEV_BACKGROUND=1 pnpm exec astro dev` instead.
