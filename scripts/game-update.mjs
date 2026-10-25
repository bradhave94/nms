// After a game patch: rebuild the site's data from a fresh extractor run, then test, check, build and audit it, and
// say what changed. Run from the repo root once the extractor has written its output:
//   pnpm game-update                    every step, stopping at the first failure
//   pnpm game-update --list             the steps, numbered
//   pnpm game-update --from 4           start at step 4 (after fixing what stopped a run)
//   pnpm game-update --only test,check  only these phases (data, history, test, build, check, audit)
//   pnpm game-update --skip audit       all but these phases
//   pnpm game-update --with classic     add an optional step group from the config (see --list)
//   pnpm game-update --source <dir>     extractor output somewhere else (also: the env variable the config names)
//   pnpm game-update --dry-run          print the commands without running them
// Shared tooling: this file is the same in every game-site repo. The steps live in site-tooling.config.mjs
// (`gameUpdate`); fix a bug here, then copy the file to the other repos unchanged.
// Commands run through the shell (cmd.exe on Windows), so they are the same commands as the repo's pnpm scripts.
// Nothing is committed or pushed: the summary lists what changed for you to review.
/* eslint-disable no-console -- a command-line runner: it prints what it does */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : null; };
const list = (k) => (opt(k) ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const fail = (msg) => { console.error(`\ngame-update: ${msg}`); process.exit(1); };

const cfgFile = path.resolve(ROOT, opt('--config') ?? process.env.SITE_TOOLING_CONFIG ?? 'site-tooling.config.mjs');
if (!fs.existsSync(cfgFile)) fail(`no ${path.relative(ROOT, cfgFile)}. Run this from the repo root.`);
const G = (await import(pathToFileURL(cfgFile).href)).default.gameUpdate;
if (!G) fail('no `gameUpdate` block in site-tooling.config.mjs');

// ---------- the extractor output ----------
const S = G.source ?? {};
const source = path.resolve(ROOT, opt('--source') ?? (S.env && process.env[S.env]) ?? S.path ?? '../_output');
const env = { ...process.env, ...(G.env ?? {}) };
if (S.env) env[S.env] = source; // the data scripts read the same folder this run checked

// ---------- context for config functions ----------
const abs = (rel) => path.resolve(ROOT, rel);
const ctx = {
  root: ROOT, source,
  readText: (rel) => fs.readFileSync(abs(rel), 'utf8'), readJson: (rel) => JSON.parse(fs.readFileSync(abs(rel), 'utf8')),
  exists: (rel) => fs.existsSync(abs(rel)), list: (rel) => (fs.existsSync(abs(rel)) ? fs.readdirSync(abs(rel)) : []),
  existsAbs: (p) => fs.existsSync(p), readAbs: (p) => fs.readFileSync(p, 'utf8'),
};

// ---------- the steps: config steps, plus optional groups after the last step of their phase ----------
const PHASES = ['data', 'history', 'test', 'build', 'check', 'audit'];
const groups = G.optional ?? {};
for (const g of list('--with')) if (!groups[g]) fail(`no optional step group "${g}" (there are: ${Object.keys(groups).join(', ') || 'none'})`);
let steps = G.steps.map((s) => ({ ...s }));
for (const g of list('--with')) for (const s of groups[g]) {
  const at = steps.map((x) => x.phase).lastIndexOf(s.phase);
  steps.splice(at < 0 ? steps.length : at + 1, 0, { ...s, group: g });
}
steps.forEach((s, i) => { s.n = i + 1; if (!PHASES.includes(s.phase)) fail(`step ${s.n}: unknown phase "${s.phase}" (use ${PHASES.join(', ')})`); });
const label = (s) => s.name ?? (typeof s.run === 'string' ? s.run : '(decided when it runs)');

if (argv.includes('--list')) {
  console.log(`game-update steps (source ${source}):`);
  for (const s of steps) console.log(`  ${String(s.n).padStart(2)}  ${s.phase.padEnd(7)}  ${label(s)}${s.group ? `  [--with ${s.group}]` : ''}`);
  for (const [g, ss] of Object.entries(groups)) if (!list('--with').includes(g)) console.log(`      --with ${g}: ${ss.map(label).join(', ')}`);
  process.exit(0);
}

const from = opt('--from');
const only = list('--only'), skip = list('--skip');
for (const p of [...only, ...skip]) if (!PHASES.includes(p)) fail(`unknown phase "${p}" (use ${PHASES.join(', ')})`);
let start = 1;
if (from) { start = /^\d+$/.test(from) ? +from : (steps.find((s) => s.phase === from)?.n ?? 0); if (start < 1 || start > steps.length) fail(`--from ${from}: no such step (see --list)`); }
const todo = steps.filter((s) => s.n >= start && (!only.length || only.includes(s.phase)) && !skip.includes(s.phase));
const DRY = argv.includes('--dry-run');

// ---------- checks before anything runs ----------
const needsSource = todo.some((s) => s.phase === 'data' || s.phase === 'history');
if (needsSource) {
  if (!fs.existsSync(source)) fail(`no extractor output at ${source}.\nRun the extractor first${S.env ? `, or point ${S.env} (or --source) at its output` : ' (or pass --source)'}.`);
  for (const n of S.need ?? []) if (!fs.existsSync(path.join(source, n))) fail(`${path.join(source, n)} is missing: the extractor run looks incomplete.`);
}
const git = (args) => spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
const diffPaths = (G.diffPaths ?? []).filter((p) => fs.existsSync(abs(p)) || p.includes('*'));
const dirtyBefore = diffPaths.length ? (git(['status', '--porcelain', '--', ...diffPaths]).stdout ?? '').trim() : '';
if (dirtyBefore && !DRY && start === 1) console.warn(`game-update: uncommitted changes in the data files before this run; the summary will include them:\n${dirtyBefore.split('\n').slice(0, 10).join('\n')}`);

// ---------- run ----------
console.log(`game-update: ${todo.length} of ${steps.length} steps, source ${source}${DRY ? ' (dry run)' : ''}`);
const t0 = Date.now();
for (const s of todo) {
  let cmd = s.run;
  if (typeof cmd === 'function') { try { cmd = cmd(ctx); } catch (e) { fail(`step ${s.n} (${s.phase}) could not decide its command: ${e.message}`); } }
  const head = `[${s.n}/${steps.length}] ${s.phase}`;
  if (!cmd) { console.log(`\n${head}: ${s.name ?? 'step'}: nothing to do`); continue; }
  console.log(`\n${head}: ${cmd}`);
  if (DRY) continue;
  const t = Date.now();
  const r = spawnSync(cmd, { cwd: ROOT, env, stdio: 'inherit', shell: true });
  if (r.error || r.status !== 0) {
    const why = r.error ? r.error.message : r.signal ? `stopped by ${r.signal}` : `exit code ${r.status}`;
    fail(`step ${s.n}/${steps.length} (${s.phase}) failed: ${cmd} (${why}).\nFix it, then go on from there: pnpm game-update --from ${s.n}${list('--with').length ? ` --with ${list('--with').join(',')}` : ''}`);
  }
  console.log(`${head}: ok (${((Date.now() - t) / 1000).toFixed(0)} s)`);
}
if (DRY) process.exit(0);

// ---------- summary ----------
console.log(`\ngame-update: all ${todo.length} steps passed in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
if (diffPaths.length) {
  const stat = (git(['diff', '--stat', '--', ...diffPaths]).stdout ?? '').trimEnd();
  const status = (git(['status', '--porcelain', '--untracked-files=all', '--', ...diffPaths]).stdout ?? '').split('\n').filter(Boolean);
  const count = (re) => status.filter((l) => re.test(l)).length;
  console.log(`\nchanged data files (${diffPaths.join(', ')}):`);
  console.log(stat ? stat.split('\n').slice(-25).join('\n') : '  no changes to tracked files');
  console.log(`  ${count(/^ ?M/)} modified, ${count(/^\?\?|^A/)} new, ${count(/^ ?D/)} deleted`);
}
for (const fn of G.summary ?? []) {
  try { const line = fn(ctx); if (line) console.log(line); } catch (e) { console.log(`(a summary line failed: ${e.message})`); }
}
console.log('\nNothing was committed. Review the diff, then commit and open a PR as usual.');
