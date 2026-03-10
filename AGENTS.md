# AGENTS.md

## Cursor Cloud specific instructions

This is a self-contained **Astro** static site (No Man's Sky Recipes) with no database, external APIs, or Docker dependencies. All game data lives as static JSON in `src/data/` and `src/datav2/`.

### Running services

- **Dev server:** `npm run dev` — starts on `http://localhost:4321/`

### Standard commands

See `package.json` scripts and `README.md` for the full list. Key commands:

| Task | Command |
|------|---------|
| Lint | `npm run lint` |
| Type-check | `npm run type-check` |
| Build | `npm run build` |
| Dev server | `npm run dev` |

### Notes

- The ESLint config uses flat config format (`eslint.config.mjs`) with ESLint 9. The `lint` script uses `--ext` flags which work with the current setup.
- `npm run build` generates ~4,800+ static pages and takes ~25 seconds. This is expected.
- No environment variables or secrets are needed for development.
