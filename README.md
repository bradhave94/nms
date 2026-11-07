# Welcome to [No Man’s Sky Recipes](https://nomansskyrecipes.com/)

![image](https://user-images.githubusercontent.com/5970177/219064525-4f4709b1-a768-40c7-95dd-41a5d123e925.png)

## Project Structure

Inside of the project, you'll see the following folders and files:

```
/
├── public/
│   └── 
├── src/
│   ├── assets/
│   │   └── 
│   ├── components/
│   │   └── 
│   ├── data/
│   │   └── 
│   ├── layouts/
│   │   └── 
│   └── pages/
│       └── 
│   └── untils/
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## Commands

All commands are run from the root of the project, from a terminal:

| Command                | Action                                             |
| :--------------------- | :------------------------------------------------- |
| `pnpm install`         | Installs dependencies (requires pnpm 11+)          |
| `pnpm run dev`         | Starts local dev server at `localhost:4321`        |
| `pnpm run build`       | Build your production site to `./dist/`            |
| `pnpm run preview`     | Preview your build locally, before deploying       |
| `pnpm run astro ...`   | Run CLI commands like `astro add`, `astro preview` |
| `pnpm run astro --help`| Get help using the Astro CLI                       |

## Amp orbs

Amp runs `.agents/setup` before saving a prepared project snapshot. It installs
Node from `.nvmrc`, pnpm from `package.json`, and dependencies from the frozen
lockfile, then applies the alliance migrations to **local D1 only**. Matching
snapshots skip setup; reruns reuse installed tools and pnpm's dependency cache.
No secrets or production access are required.

There is no required `.env` file. To test alliance moderation, add a
development-only `ALLIANCES_ADMIN_TOKEN` to the gitignored `.dev.vars` after the
orb starts, then restart the dev service. Without it, admin login stays disabled.
Leave `ALLIANCES_ALERT_EMAIL` and `ALLIANCES_NTFY_TOPIC` unset for normal local
work. Setup never copies production secrets or writes credentials into snapshots,
which can be reused by other threads and project members.

Amp's **Secrets & Env Vars** settings inject values into orb processes without
creating an `.env` file. Use project scope for shared development configuration,
or personal scope for your own credentials. Personal values override project
values, which override workspace values. Cloudflare Worker bindings are separate
from the shell environment; `.dev.vars` remains the explicit local secret source
for this site's Worker. After changing Amp settings in an existing orb, run
`amp orb restart-processes` to refresh its environment and managed services.

The toolchain lives under `~/.local/share/nms-orb`. Setup adds a checkout-scoped
login-shell hook so both agents and supervised services use it. It also pins a
newer local Workers runtime: the runtime bundled with the locked Astro plugin
is older than the site's Cloudflare compatibility date. This override leaves
`wrangler.jsonc` and production dependencies unchanged. Revisit the override in
`.agents/setup` when updating the Cloudflare adapter or compatibility date.

Run `amp orb services ensure` to start the declared dev service and print its
preview URL. Its readiness check loads `/alliances/`, exercising the local
database as well as Astro. Amp supervises the service across pause/resume; no
resume hook or dependency reinstall is needed on wake. Portal URLs are generated
per orb and ignored by Git.
