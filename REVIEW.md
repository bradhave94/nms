# Code review guidelines

How changes to this repo get reviewed, and what reviewers check. This file was written from the findings of BH's multi-round reviews across his game sites: the save viewers, live maps, 3D view, vault plans, and the 2026-10 accessibility sweep. `AGENTS.md` has the repo's rules and commands; this file is how to review against them.

## When a change needs review

- **New features should get review rounds before `main` (strongly recommended).** That means a new tool, page type, map layer, save or file reader, pipeline stage, or anything a player interacts with. Independent rounds beat a one-shot review.
- **Small changes skip review.** Plain bug fixes, copy, data refreshes and small styling changes ship after your own checks: build, tests, and the browser checks below.
- **Reviewers are independent subagents,** separate from each other and from the author. Use two reviewers for a big feature (findings both raise are the most likely to be real) and one for a small one.
- **Rounds:**
  - Round 1 is a full review against a brief.
  - Later rounds are delta-only. Re-run every earlier repro to confirm each fix, review only the changed code for regressions (fixes regularly introduce new bugs), and add a short list of anything new.
  - Stop when a round finds nothing blocking.
- **Branches and shipping:**
  - Work on a branch in its own git worktree, never in someone else's checkout.
  - After the last round, open a PR. BH's standing permission lets the site bot squash-merge its own PR once `pnpm run build` passes: one merge per batch, and no other pushes to `main`. Workers Builds runs only on `main`, so the local build is the gate. On nms, blog work goes on `nms-writer/<slug>` branches and publishes right away (see **Shipping** and **Blog posts** in `AGENTS.md`).
  - After merge, wait for the Workers Builds run of Worker `nms` on the merge commit, then confirm the change is live with browser-like headers (real User-Agent, `Sec-Fetch-Mode: navigate`, `Sec-Fetch-Dest: document`, `Accept: text/html`).
- **Keep it fast.** BH wants things finished quickly: keep briefs tight, keep later rounds to the delta, and don't reopen decisions already made.

## The brief (what each reviewer gets)

Each brief includes:
- a feature summary, the branch and commit, and the code locations;
- the `AGENTS.md` rules that apply;
- decisions BH already made, which are not findings (for example: no legacy Valheim world-gen, no "link saves folder" where Chrome blocks it);
- how to build and serve on the reviewer's own port;
- where the real-data copies are, what to look at, and where to write the report.

Every brief also includes these safety rules:
- Never send input to the real desktop; use headless or automated browsers only.
- Never touch BH's real save folders. Copy first, and delete the copies afterwards.
- Never kill other agents' processes.

## Reviewer report

Write the report to `_output/<site>/<feature>-review[-rN]/<reviewer>/REPORT.md`. If your tool can't write files, return the report as your final message and the lead saves it.

- Rank findings **blocking / should fix / nit**. For each, give:
  - what happens;
  - a **repro**: a script in the same folder, or exact steps;
  - the measured numbers and `file:line`;
  - expected vs actual;
  - a suggested fix.
- **Verify every claim; don't guess.**
  - Check suspicions against the data before reporting. Two "Eikthyr" labels turned out to be two real altars.
  - Label pre-existing issues as pre-existing.
  - Separate harness artifacts from real bugs: a probe holding IndexedDB open, Playwright scroll shifts, timings made flaky by load on a shared CPU.
- **Test a fresh build** of the commit under review, on your own port. `dist/` is often older than the last commit.
- **List what you couldn't test** separately, such as Worker-only behaviour you couldn't run locally, the real Chrome folder picker, real drag-and-drop, pinch and iOS. Never mark it as passing.
- Keep scripts and screenshots in `_output`, never in the repo.

## Fix report

Write `fix-rN-report.md` next to the reviews. It contains:
- a **Finding → Fix (commit) → How verified** table that cites every reviewer's finding ID;
- a "Not changed (why)" list;
- a "Decisions for BH" list for anything only the owner can answer.

Each fixed finding gets a regression test or a check in the QA script, so the next round can re-run it.

## Checklist

### Always
- **Commands:** the `AGENTS.md` commands pass: build, tests, and the repo's dist checks (no `null`, `undefined`, `NaN` or raw IDs on pages).
- **Browser at 390 px and 1440 px:** no console errors and no sideways scroll. Nothing is covered; check overlays with `elementFromPoint`, not only screenshots.
- **Accessibility:** the `AGENTS.md` Accessibility rules still hold:
  - the skip link is visible on focus;
  - focus rings aren't clipped by `clip-path` or `overflow`;
  - field borders have 3:1 contrast;
  - targets are at least 24 px, and primary targets 44 px;
  - results are announced via `role=status`;
  - everything is keyboard-reachable, and Esc returns focus;
  - button names are distinct.
- **Honest labels:**
  - Counts and words mean exactly what they say: kinds vs counts, built vs dropped, bases vs lone pieces, de-duplicated.
  - "Same as X" claims hold numerically.
  - Anything the data can't prove is labelled approximate and raised as a question for BH, who can check in game. Never ship it as fact.
- **Plain, self-explaining UI copy:**
  - BH couldn't tell "Choose folder" from "Choose file". If a control needs explaining, the UI must explain it.
  - Most players use Steam Cloud saves.
  - Phone copy doesn't assume a PC: no folder picking, drag-and-drop or `%LOCALAPPDATA%` paths on phones.
- **SEO:**
  - The sitemap only gains URLs; diff it against the live sitemap.
  - Removed or renamed URLs get 301s.
  - Titles and descriptions are unique, and JSON-LD is valid.
  - Asset paths match case exactly. Windows hides `Altar_d.webp` vs `altar_d.webp`; Cloudflare returns 404.
- **Blog:** no two posts across BH's game sites share a `pubDate`. List all of them first, and keep `updatedDate` no earlier than `pubDate`. New posts are published (no draft), dated today, never future-dated.

### State and async
- **Deep links:** loading a save never overrides a deep link or shared view (`?s=`, `#z/x/y`, `?q=`). Jump to the base only when the player picks it.
- **Stores:**
  - Each persisted store has one owner.
  - Two writers can't overwrite each other, and stale in-memory copies aren't written back.
- **Changing input:**
  - State resets or re-validates when the input changes: new files, a slot or world switch, a failed read.
  - A background refresh doesn't close unrelated UI.
- **Workers and IndexedDB:**
  - Workers handle `error` and `messageerror`, have a timeout, and always clear the busy state.
  - Messages to workers are ordered (init before data).
  - IndexedDB `open()` can hang; give it a timeout.
- **Requests and caches:**
  - A second request during a read is queued or announced, not silently dropped.
  - Results computed before the data was ready get recomputed.
  - Caches are invalidated by everything they depend on.

### Performance
- **Lazy loading:** heavy work (workers, bakes, big JSON) loads only when the feature is used.
- **Scale:** no quadratic loops over save objects and no unbounded DOM lists.
- **Public endpoints:** OG images and APIs are rate-limited and normalise cache keys.

### Privacy and security (saves hold account names and Steam/EOS IDs)
- **No leaks:** nothing read from a save reaches:
  - the URL;
  - `localStorage`, beyond what `AGENTS.md` allows;
  - analytics, including GA's history-change page views.
- **Escaping:** every player-supplied string (world, character, pin, sign, bed, folder and file names) is escaped. Try `<img src=x onerror=alert(1)>`.
- **"Never uploaded" holds:** the page makes only GET requests, plus the analytics tag.
- **Clean diff:**
  - The diff contains no real saves, names or IDs.
  - Fixtures are synthetic.
  - Real-save tests read BH's copies outside the repo, assert counts only, and skip when the copies are absent.

## This repo

- Commands: lint, type-check, `pnpm build` and every `pnpm test:*` script (see **Standard commands** in `AGENTS.md`).
- The main checkout is often on BH's own branch; review and fix in a worktree off `origin/main`.
- This site has no save readers or live maps: skip those checklist sections.
- **Alliance directory and `api/`:** every input validated and length-capped server-side; admin routes require auth; a listing's private contact is never sent to the public page or API; edit requests only change the fields shown in the Edits tab; rate limits on submit and edit; no secrets in the client bundle or the repo.
- Ads (NitroPay) are outside our control, but our layout must not let them cover content or controls.
- Item colours and rarity swatches keep readable text (see **Accessibility** in `AGENTS.md`).
