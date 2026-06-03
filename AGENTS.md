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
- **Node.js:** Astro 6 requires `>=22.12.0`. Production (Vercel) uses **24.x**; `.nvmrc` is set to `24` for local parity.
- No environment variables or secrets are needed for development.
