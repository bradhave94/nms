// SEO audit over a production build: every HTML page in the build output plus the sitemaps, robots.txt and RSS.
// Shared tooling: this file is the same in every game-site repo. Site settings live in site-tooling.config.mjs
// (`site` and `seoAudit`); fix a bug here, then copy the file to the other repos unchanged.
// Usage, after the build:
//   node scripts/seo-audit.mjs [--out report.json | report.json] [--vocab|--schema schemaorg-current-https.jsonld]
//                              [--live [N] | --fetch] [--config site-tooling.config.mjs]
//   --vocab   schema.org vocabulary (https://schema.org/version/latest/schemaorg-current-https.jsonld) to check JSON-LD
//             types and properties. With `seoAudit.vocab: 'auto'` it is downloaded once into node_modules/.cache.
//   --live N  also fetch N og:image URLs from the live site (--fetch = --live with the config's default count).
// Checks titles, descriptions, Open Graph/Twitter, canonicals, robots, headings, image alt text, breadcrumbs, JSON-LD,
// internal links and click depth, per page and per page type. It is a report and exits 0, unless the config lists
// `gate` issue codes: any page or site issue with one of those codes then exits 1 (enshrouded's `pnpm check`).
/* eslint-disable no-console -- a report script: it prints its summary */
/* global URL, fetch */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

// ---------- options and config ----------
const ROOT = process.cwd();
const argv = process.argv.slice(2);
const VALUE_OPTS = new Set(['--out', '--vocab', '--schema', '--config', '--live']);
const opt = (...keys) => { for (const k of keys) { const i = argv.indexOf(k); if (i >= 0 && argv[i + 1] != null && !argv[i + 1].startsWith('--')) return argv[i + 1]; } return null; };
const positional = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && VALUE_OPTS.has(argv[i - 1])));
const cfgFile = path.resolve(ROOT, opt('--config') ?? process.env.SITE_TOOLING_CONFIG ?? 'site-tooling.config.mjs');
const CFG = (await import(pathToFileURL(cfgFile).href)).default;
const SITE = CFG.site;
const S = CFG.seoAudit ?? {};
const ORIGIN = SITE.origin.replace(/\/$/, '');
const DIST = path.resolve(ROOT, SITE.dist ?? 'dist');
const OUT = opt('--out') ?? positional.find((a) => a.endsWith('.json')) ?? null;
const VOCAB = opt('--vocab', '--schema') ?? (S.vocab === 'auto' ? path.join(ROOT, 'node_modules', '.cache', 'schemaorg-current-https.jsonld') : null);
const LIVE = argv.includes('--live') || argv.includes('--fetch') ? +(/^\d+$/.test(opt('--live') ?? '') ? opt('--live') : S.liveSample ?? 8) : 0;

const read = (p) => fs.readFileSync(p, 'utf8');
const readRel = (rel) => read(path.join(ROOT, rel));
const ctx = { root: ROOT, readText: readRel, readJson: (rel) => JSON.parse(readRel(rel)), exists: (rel) => fs.existsSync(path.join(ROOT, rel)) };
const rx = (s, f) => (s == null ? null : s instanceof RegExp ? s : new RegExp(s, f));
const rxList = (a) => (a ?? []).map((s) => rx(s));
const fileExists = (p) => { try { return fs.statSync(p).isFile(); } catch { return false; } };

// settings (defaults reproduce the dragonwilds/nms audit)
const BRAND = S.brand ?? {};                                  // { suffix, prefix, rule, exceptHome }
const SUFFIX = BRAND.suffix ?? '';
const TITLE = { min: 30, max: 60, ...S.title };
const DESC = { min: 70, max: 160, dangling: false, ...S.description };
const GAMES = (S.games ?? []).map((g) => ({ prefix: '/', ...g, re: rx(g.pattern, g.flags ?? '') }));
const UTILITY = rxList(S.utility);                            // light rules: search pages and the like
const SKIP = rxList(S.skip);                                  // not audited at all (dev harnesses)
const ON_DEMAND = rx(S.onDemand);                             // server-rendered routes with no HTML in the build
const REQUIRED_META = S.requiredMeta ?? ['og:title', 'og:description', 'og:url', 'og:image', 'og:type', 'og:site_name', 'og:image:width', 'og:image:height', 'og:image:alt', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image'];
// WebPage and its subtypes. FAQPage is always counted apart (it sits next to the page node when a post shows a FAQ);
// sites whose blog posts are a BlogPosting page node (no WebPage beside it) add BlogPosting/Article in the config.
const PAGE_TYPES = new Set(S.pageTypes ?? ['WebPage', 'ItemPage', 'CollectionPage', 'AboutPage', 'SearchResultsPage', 'ProfilePage', 'QAPage', 'ContactPage']);
const BANNED = new Set(S.bannedTypes ?? ['Recipe', 'NutritionInformation', 'HowTo', 'HowToStep', 'HowToSupply', 'HowToTool']);
const KNOWN_TYPES = S.knownTypes ? new Set(S.knownTypes) : null; // used when no vocabulary is loaded
const GATE = new Set(S.gate ?? []);
const isPost = (u) => (S.isPost ? S.isPost(u) : /^\/blog\/(?!tag\/)[^/]+\/$/.test(u));
const pageTypeOf = (u) => (S.pageType ? S.pageType(u, ctx) : defaultType(u));
function defaultType(u) {
  if (u === '/') return 'home';
  const s = u.split('/').filter(Boolean);
  if (s.length === 1) return s[0].endsWith('.html') ? s[0] : `${s[0]}/`;
  if (s[0] === 'blog' && s[1] === 'tag') return 'blog/tag/[tag]';
  return `${s[0]}/[slug]`;
}

// ---------- helpers ----------
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const dec = (s = '') => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e] ?? m));
const strip = (s) => dec(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const attrs = (s) => { const o = {}; for (const m of s.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) o[m[1].toLowerCase()] = dec(m[2] ?? m[3] ?? m[4] ?? ''); return o; };
const TAG_IN = `(?:[^>"']|"[^"]*"|'[^']*')*`; // a tag's inside: an attribute value may hold a raw >
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}(\\s${TAG_IN})?>`, 'gi'))].map((m) => attrs(m[1] ?? ''));
const norm = (s = '') => s.toLowerCase().replace(/[’']/g, "'").replace(/[^\p{L}\p{N}' ]+/gu, ' ').replace(/\s+/g, ' ').trim();
const escRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const files = []; (function walk(d) { if (!fs.existsSync(d)) return; for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (f.name.endsWith('.html')) files.push(p); } })(DIST);
const urlOf = (f) => { const r = path.relative(DIST, f).split(path.sep).join('/'); return '/' + (r === 'index.html' ? '' : r.endsWith('/index.html') ? r.slice(0, -10) : r); };
const bareHost = new URL(ORIGIN).host.replace(/^www\./, '');
const OTHER_HOST = new RegExp(`(^|\\.)${escRx(bareHost)}$`);

let sharp = null;
try { sharp = (await import(pathToFileURL(createRequire(path.join(ROOT, 'package.json')).resolve('sharp')).href)).default; } catch { /* no sharp: image sizes are not checked */ }

// ---------- redirects (vercel.json and/or public/_redirects), for link checks ----------
function vercelRx(src) {
  let out = ''; let i = 0;
  const s = src.length > 1 ? src.replace(/\/$/, '') : src;
  while (i < s.length) {
    const m = /^:(\w+)(\((?:[^()]|\([^()]*\))*\))?([*+?])?/.exec(s.slice(i));
    if (m) { out += m[2] ?? (m[3] === '*' ? '.*' : m[3] === '+' ? '.+' : '[^/]+'); i += m[0].length; continue; }
    if (s[i] === '(') { let d = 0, j = i; for (; j < s.length; j++) { if (s[j] === '(') d++; else if (s[j] === ')' && --d === 0) break; } out += s.slice(i, j + 1); i = j + 1; continue; }
    out += /[.+?^${}[\]\\|*]/.test(s[i]) ? '\\' + s[i] : s[i]; i++;
  }
  return new RegExp('^' + out + '/?$');
}
const cfRx = (src) => new RegExp('^' + (src.length > 1 ? src.replace(/\/$/, '') : src).split(/(\*|:\w+)/).map((p) => (p === '*' ? '.*' : /^:\w+$/.test(p) ? '[^/]+' : escRx(p))).join('') + '/?$');
const redirects = [];
for (const f of S.redirects ?? ['vercel.json']) {
  if (!ctx.exists(f)) continue;
  if (f.endsWith('.json')) { for (const r of ctx.readJson(f).redirects ?? []) if (!r.has && !r.missing) redirects.push({ source: r.source, destination: r.destination, rx: vercelRx(r.source) }); }
  else for (const line of readRel(f).split('\n')) { const t = line.trim().split(/\s+/); if (t[0] && !t[0].startsWith('#') && t[1]) redirects.push({ source: t[0], destination: t[1], rx: cfRx(t[0]) }); }
}
const redirectOf = (u) => redirects.find((r) => r.rx.test(u)) ?? null;

// ---------- sitemaps, robots, rss ----------
const siteIssues = []; const siteIssue = (code, detail) => siteIssues.push(detail != null ? `${code}: ${detail}` : code);
if (!files.length) siteIssue('no-pages', `no HTML in ${path.relative(ROOT, DIST) || '.'} (run the build first)`);
const sitemapUrls = new Set(); const imageSitemap = { files: [], pages: 0, images: 0 }; const imagePages = [];
const idxFile = path.join(DIST, 'sitemap-index.xml');
const idx = fs.existsSync(idxFile) ? read(idxFile) : '';
if (!idx) siteIssue('sitemap-index-missing');
const robotsTxt = fs.existsSync(path.join(DIST, 'robots.txt')) ? read(path.join(DIST, 'robots.txt')) : '';
const robotsSitemaps = [...robotsTxt.matchAll(/^Sitemap:\s*(\S+)/gim)].map((m) => m[1]);
const indexed = [...idx.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => dec(m[1]));
const sitemapLocs = [...new Set([...indexed, ...robotsSitemaps.filter((u) => !/sitemap-index\.xml$/.test(u))])].filter((u) => !(ON_DEMAND && ON_DEMAND.test(new URL(u, ORIGIN).pathname)));
for (const s of sitemapLocs) {
  if (!s.startsWith(ORIGIN + '/')) siteIssue('sitemap-off-origin', s);
  const local = path.join(DIST, decodeURIComponent(new URL(s, ORIGIN).pathname));
  if (!fs.existsSync(local)) { siteIssue('sitemap-file-missing', s); continue; }
  const xml = read(local);
  if (!/^<\?xml/.test(xml) || !/<urlset[\s>]/.test(xml) || !xml.trim().endsWith('</urlset>')) siteIssue('sitemap-not-urlset', s);
  const isImage = /<image:image>/.test(xml);
  if (isImage) imageSitemap.files.push(path.basename(local));
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = dec(/<loc>([^<]+)<\/loc>/.exec(m[1])?.[1] ?? '');
    if (!loc) { siteIssue('sitemap-url-no-loc', s); continue; }
    if (isImage) {
      imageSitemap.pages++; imagePages.push(loc);
      for (const im of m[1].matchAll(/<image:loc>([^<]+)<\/image:loc>/g)) { imageSitemap.images++; const u = new URL(dec(im[1]), ORIGIN); if (u.origin !== ORIGIN || !fs.existsSync(path.join(DIST, decodeURIComponent(u.pathname)))) siteIssue('image-sitemap-image-missing', im[1]); }
      continue;
    }
    sitemapUrls.add(loc);
  }
}
for (const f of fs.existsSync(DIST) ? fs.readdirSync(DIST).filter((f) => /^(image-)?sitemap.*\.xml$/.test(f) && f !== 'sitemap-index.xml') : []) if (!sitemapLocs.some((u) => u.endsWith('/' + f))) siteIssue('sitemap-not-indexed', f);
if (!robotsTxt) siteIssue('robots-txt-missing');
else {
  if (!robotsSitemaps.includes(`${ORIGIN}/sitemap-index.xml`)) siteIssue('robots-sitemap-line', `no "Sitemap: ${ORIGIN}/sitemap-index.xml"`);
  for (const u of robotsSitemaps) if (!u.startsWith(ORIGIN + '/') || !fs.existsSync(path.join(DIST, decodeURIComponent(new URL(u).pathname)))) siteIssue('robots-sitemap-missing', u);
  if (/^Disallow:\s*\/\s*$/im.test(robotsTxt)) siteIssue('robots-disallow-all');
}
const RSS = S.rss === false ? null : S.rss ?? 'blog/rss.xml';
const rss = RSS && fs.existsSync(path.join(DIST, RSS)) ? read(path.join(DIST, RSS)) : '';
if (RSS && S.rssRequired !== false && !rss) siteIssue('rss-missing', `/${RSS}`);
if (rss) {
  if (!/<rss[\s\S]*<channel>/.test(rss)) siteIssue('rss-invalid');
  for (const l of [...rss.matchAll(/<link>([^<]+)<\/link>/g)].map((m) => m[1])) if (!l.startsWith(ORIGIN + '/')) siteIssue('rss-link-off-origin', l);
}
if (S.faviconIco !== false && !fs.existsSync(path.join(DIST, 'favicon.ico'))) siteIssue('favicon-ico-missing');
const nf = fs.existsSync(path.join(DIST, '404.html')) ? read(path.join(DIST, '404.html')) : '';
if (!nf) siteIssue('404-missing'); else if (!/<meta[^>]+name="robots"[^>]+noindex/i.test(nf)) siteIssue('404-indexable');
const indexable = S.indexable ? new RegExp(S.indexable.pattern).test(readRel(S.indexable.file)) : null; // site-wide noindex switch (enshrouded)

// ---------- schema.org vocabulary ----------
async function loadVocab() {
  if (!VOCAB) return null;
  if (!fs.existsSync(VOCAB)) {
    if (S.vocab !== 'auto' || opt('--vocab', '--schema')) { console.warn(`seo-audit: no vocabulary at ${VOCAB}`); return null; }
    try {
      const r = await fetch('https://schema.org/version/latest/schemaorg-current-https.jsonld');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      fs.mkdirSync(path.dirname(VOCAB), { recursive: true }); fs.writeFileSync(VOCAB, await r.text());
    } catch (e) { console.warn(`seo-audit: schema.org vocabulary not downloaded (${e.message}); types and properties are not checked`); return null; }
  }
  const g = JSON.parse(read(VOCAB))['@graph'];
  const id = (x) => String(x?.['@id'] ?? x).replace(/^schema:/, '');
  const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
  const classes = new Map(), props = new Map();
  for (const n of g) {
    const t = arr(n['@type']).map(String);
    if (t.includes('rdfs:Class')) classes.set(id(n), arr(n['rdfs:subClassOf']).map(id));
    if (t.includes('rdf:Property')) props.set(id(n), { domain: arr(n['schema:domainIncludes']).map(id), superseded: !!n['schema:supersededBy'] });
  }
  const anc = new Map();
  const up = (c) => { if (anc.has(c)) return anc.get(c); const s = new Set([c]); anc.set(c, s); for (const p of classes.get(c) ?? []) for (const a of up(p)) s.add(a); return s; };
  return { classes, props, up };
}
const vocab = await loadVocab();
const GOOGLE_PROPS = new Set(['query-input']); // Google's SearchAction extension, not in the vocabulary

// ---------- per page ----------
const FILLER = rx(S.filler ?? '\\b(delve|dive into|deep dive|comprehensive|ultimate guide|ultimate|everything you need|look no further|seamless|in-depth|explore the world|discover the|embark|journey through|whether you\'re|treasure trove|game-?changer|elevate|navigate the|myriad|plethora|tapestry|unlock the secrets|in this (?:article|guide)|in the realm of|in the world of|must-have|unleash|robust)\\b', 'i');
const BAD_TITLE = /\bundefined\b|\bnull\b|\bNaN\b|\[object|\$\w+_|\s{2,}|^\s*[–·:|-]|[–·:|-]\s*$|\s[–·:|-]\s*[–·:|-]\s|\(\s*\)/;
const BAD_DESC = /\bundefined\b|\bnull\b|\bNaN\b|\[object|\$\w+_|\s{2,}|\s\.(\s|$)|:\s*\.|(?<!\.)\.\.(?!\.)/;
const DANGLING = /\b(and|or|of|the|a|an)\.(\s|$)/i;
const URL_KEYS = new Set(['url', 'item', '@id', 'image', 'logo', 'sameAs', 'contentUrl', 'thumbnailUrl', 'urlTemplate', 'mainEntityOfPage', 'primaryImageOfPage', 'target']);
const REQ = { BreadcrumbList: ['itemListElement'], ItemList: ['itemListElement'], Organization: ['name', 'url'], WebSite: ['name', 'url'], BlogPosting: ['headline', 'image', 'datePublished', 'author'], Article: ['headline', 'image', 'datePublished', 'author'], ItemPage: ['name', 'url'], CollectionPage: ['name', 'url'], WebPage: ['name', 'url'], FAQPage: ['mainEntity'], VideoGame: ['name'], WebApplication: ['name', 'applicationCategory'], ...S.requiredProps };
const H1T = { overlap: 0.6, leadWords: 2, leadChars: 0, leadGamePrefix: null, minWordLength: 1, substring: false, trailingCount: false, ...S.h1Title };
const H1_STRIP = rxList(S.h1Strip).map((r) => new RegExp(r.source, 'g'));
const CRUMBS = { visibleMin: null, compareUrls: true, ...S.breadcrumbs };
const KEY_IMG = S.keyImage ?? null; // { find: 'eager' | 'phead', types: regex }
const OG = { title: 'exact', ...S.og };
const pages = {}; const titles = new Map(); const descs = new Map(); const linkTargets = new Map(); const graph = new Map(); const ogImages = new Map(); const stubs = new Map();
const gameOf = (u) => GAMES.filter((g) => u.startsWith(g.prefix)).sort((a, b) => b.prefix.length - a.prefix.length)[0] ?? null;
const stripBrand = (t) => (SUFFIX && t.endsWith(SUFFIX) ? t.slice(0, -SUFFIX.length) : BRAND.prefix && t.startsWith(BRAND.prefix) ? t.slice(BRAND.prefix.length) : t);

function resolveLink(u) {
  if (fileExists(path.join(DIST, u))) return 'ok';
  if (u.endsWith('/') && fileExists(path.join(DIST, u, 'index.html'))) return 'ok';
  if (ON_DEMAND && ON_DEMAND.test(u)) return u.endsWith('/') || /\.\w+$/.test(u) ? 'ok' : 'redirect-slash';
  if (!u.endsWith('/') && fileExists(path.join(DIST, u, 'index.html'))) return 'redirect-slash';
  if (stubs.has(u) || stubs.has(u + '/')) return 'stub';
  if (redirectOf(u)) return 'redirect';
  return '404';
}

for (const f of files) {
  const raw = read(f); const url = urlOf(f);
  if (SKIP.some((r) => r.test(url))) continue;
  if (url === '/404.html' && S.notFound !== 'light') continue; // 404: only the site-level sanity check above
  if (S.stubs !== false) { const refresh = /<meta http-equiv="refresh" content="\d+;\s*url=([^"]+)"/i.exec(raw.slice(0, 600)); if (refresh) { stubs.set(url, dec(refresh[1])); continue; } }
  const type = pageTypeOf(url);
  const special = url === '/404.html' ? '404' : null;
  const utility = UTILITY.some((r) => r.test(url));
  const light = !!special || utility; // no canonical, sitemap, JSON-LD page-node or depth requirements
  const lds = [...raw.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const html = raw.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<template[\s\S]*?<\/template>|<!--[\s\S]*?-->/g, '');
  const hEnd = html.indexOf('</head>');
  const head = hEnd < 0 ? '' : html.slice(0, hEnd);
  const body = html.slice(Math.max(0, html.indexOf('<body')));
  const I = []; const add = (k, d) => I.push(d != null && d !== '' ? `${k}: ${d}` : k);
  const meta = {}; for (const m of tags(head, 'meta')) { const k = (m.property || m.name || '').toLowerCase(); if (k) (meta[k] ??= []).push(m.content ?? ''); }
  const one = (k) => meta[k]?.[0];
  const links = tags(head, 'link');
  const titleM = [...head.matchAll(/<title>([\s\S]*?)<\/title>/g)];
  const title = titleM.length ? dec(titleM[0][1]).trim() : null;
  const desc = one('description') ?? null;
  const robotsMeta = (meta.robots ?? []).join(',');
  const noindex = /noindex/i.test(robotsMeta);
  const canonicals = links.filter((l) => l.rel === 'canonical').map((l) => l.href);
  const canonical = canonicals[0] ?? null;
  const game = gameOf(url);
  const p = pages[url] = { type, game: game?.name ?? null, title, desc, noindex, canonical, special, utility: light, issues: I, ld: [] };
  const rules = !utility && (!noindex || S.rulesOnNoindex !== false); // length and quality rules (af: indexable pages only)
  const self = ORIGIN + url;
  if (url.endsWith('.html') && !special) add('html-not-directory');

  // h1 (needed for the title and description checks)
  // headingsIn: 'main' = heading order is checked inside <main> only (a site menu may use h2s above the page's h1)
  const headings = (h) => [...h.matchAll(/<h([1-6])(\s[^>]*)?>([\s\S]*?)<\/h\1>/g)].map((m) => ({ l: +m[1], t: strip(H1_STRIP.reduce((s, r) => s.replace(r, ''), m[3])) }));
  const allH = headings(body);
  const hs = S.headingsIn ? headings(body.match(new RegExp(`<${S.headingsIn}\\b[\\s\\S]*<\\/${S.headingsIn}>`))?.[0] ?? body) : allH;
  const h1s = allH.filter((h) => h.l === 1);
  p.h1 = h1s[0]?.t ?? null;

  // title
  if (!title) add('title-missing'); else {
    if (titleM.length > 1) add('title-multiple');
    if (rules) {
      if (title.length < TITLE.min) add('title-short', `${title.length}: ${title}`);
      if (title.length > TITLE.max) add('title-long', `${title.length}: ${title}`);
      if (BAD_TITLE.test(title)) add('title-bad-part', title);
      if (game?.title !== false && game) {
        const t = game.stripBrand ? stripBrand(title) : title;
        if (!game.re.test(t)) add('title-no-game', game.name);
        const others = GAMES.filter((g) => g !== game && g.exclusive && g.re.test(title)).map((g) => g.name);
        if (game.exclusive && others.length) add('title-other-game', others.join(', '));
      }
      const r = BRAND.rule ?? 'none';
      const home = url === '/' && BRAND.exceptHome !== false;
      if (r === 'suffix' && !home && !title.endsWith(SUFFIX)) add('title-brand', title);
      if (r === 'suffix-unless-long' && !home && !title.endsWith(SUFFIX) && !(game?.re.test(title) && (title + SUFFIX).length > TITLE.max)) add('title-brand', title);
      if (r === 'suffix-or-prefix' && !title.endsWith(SUFFIX) && !title.startsWith(BRAND.prefix ?? '\u0000')) add('title-brand', title);
      if (p.h1) {
        const h = norm(p.h1.replace(H1T.trailingCount ? /\s+\d[\d,]*$/ : /$^/, '')).replace(/^the /, ''), t = norm(stripBrand(title)).replace(/^the /, '');
        const tw = new Set(t.split(' ')); const hw = h.split(' ').filter((w) => w.length >= H1T.minWordLength);
        const overlap = hw.length ? hw.filter((w) => tw.has(w) || (H1T.substring && t.includes(w))).length / hw.length : 1;
        if (!t.includes(h) && !h.includes(t) && overlap < H1T.overlap) add('h1-title-disagree', `${p.h1} | ${title}`);
        else if (H1T.leadWords || H1T.leadChars) {
          const lead = H1T.leadChars ? h.slice(0, H1T.leadChars) : h.split(' ').slice(0, H1T.leadWords).join(' ');
          const gp = H1T.leadGamePrefix ? norm(H1T.leadGamePrefix) + ' ' : null;
          if (!t.startsWith(lead) && !t.includes(h) && !(gp && t.startsWith(gp + lead))) add('title-not-led-by-h1', `${p.h1} | ${title}`);
        }
      }
    }
    if (!noindex || S.duplicatesIncludeNoindex) if (!special) (titles.get(title) ?? titles.set(title, []).get(title)).push(url);
  }
  // description
  if (!desc) add('desc-missing'); else {
    if ((meta.description ?? []).length > 1) add('desc-multiple');
    if (rules) {
      const d = desc.trim();
      if (d.length < DESC.min) add('desc-short', `${d.length}: ${d}`);
      if (d.length > DESC.max) add('desc-long', `${d.length}`);
      if (/…["”]?$/.test(d)) add('desc-excerpt', d.slice(-30));
      else if (!/[.!?)"”]$/.test(d) || /\.\.\.$/.test(d) || (DESC.dangling && DANGLING.test(d))) add('desc-truncated', d.slice(-40));
      if (BAD_DESC.test(d)) add('desc-bad-part', d);
      const own = p.h1 ? d.split(new RegExp(escRx(p.h1), 'i')).join(' ') : d; // the page's own name is not filler
      const fm = own.match(FILLER); if (fm) add('desc-filler', fm[0]);
      if (game?.inDescription && !(game.descPattern ? rx(game.descPattern) : game.re).test(d)) add('desc-no-game', game.name);
    }
    if (!noindex || S.duplicatesIncludeNoindex) if (!special) (descs.get(desc) ?? descs.set(desc, []).get(desc)).push(url);
  }
  // robots
  if (robotsMeta && !/^(noindex|index|follow|nofollow|max-[\w-]+:[\w-]+|none|all)(,\s*(noindex|index|follow|nofollow|max-[\w-]+:[\w-]+|none|all))*$/i.test(robotsMeta.replace(/\s/g, ''))) add('robots-odd', robotsMeta);
  if (/nofollow/i.test(robotsMeta)) add('robots-nofollow', robotsMeta);
  if (indexable != null && !special) { const optOut = S.indexable.pageOptOut && raw.includes(S.indexable.pageOptOut); if (noindex !== (optOut || !indexable)) add('robots-indexable-mismatch', `"${robotsMeta}" but indexable=${indexable}`); }
  // canonical
  const altPage = S.altPageMarker && raw.includes(S.altPageMarker); // a page that names another page as its canonical copy
  if (!canonical && !special && !utility && (!noindex || S.canonicalOnNoindex)) add('canonical-missing');
  if (canonicals.length > 1) add('canonical-multiple');
  if (canonical) {
    if (!canonical.startsWith(ORIGIN + '/')) add('canonical-off-origin', canonical);
    if (!canonical.endsWith('/')) add('canonical-no-trailing-slash', canonical);
    if (altPage) { if (canonical === self || !canonical.startsWith(ORIGIN + '/') || resolveLink(new URL(canonical).pathname) !== 'ok') add('canonical-alt-bad', canonical); }
    else if (canonical !== self) add('canonical-not-self', canonical);
  }
  if (noindex && sitemapUrls.has(self)) add('noindex-in-sitemap');
  if (!noindex && !light && canonical === self && !sitemapUrls.has(self)) add('sitemap-missing-page');
  // Open Graph / Twitter
  for (const k of [...REQUIRED_META, ...(S.extraMeta ?? [])]) if (!one(k) && !(special && k === 'og:url')) add(`${k.replace(/:/g, '-')}-missing`);
  const ogt = one('og:title');
  if (ogt && title && ogt !== title && !(OG.title === 'brandless-ok' && ogt + SUFFIX === title) && !(OG.title === 'prefix-ok' && title.startsWith(ogt))) add('og-title-differs', ogt);
  if (one('og:description') && one('og:description') !== desc) add('og-desc-differs'); // also when the page has no meta description
  if (one('twitter:title') && one('twitter:title') !== (ogt ?? title)) add('twitter-title-differs');
  if (one('twitter:description') && one('twitter:description') !== desc) add('twitter-desc-differs');
  if (one('og:url') && canonical && one('og:url') !== canonical) add('og-url-differs', one('og:url'));
  if (OG.siteName && one('og:site_name') && one('og:site_name') !== OG.siteName) add('og-site-name-differs', one('og:site_name'));
  if (isPost(url) && one('og:type') !== 'article') add('og-type-not-article', one('og:type'));
  if (isPost(url) && OG.publishedTime !== false && !one('article:published_time')) add('article-published-missing');
  const ogi = one('og:image');
  if (ogi) {
    if (!/^https:\/\//.test(ogi)) add('og-image-relative', ogi);
    else { if (!ogImages.has(ogi)) ogImages.set(ogi, { n: 0, pages: [] }); const o = ogImages.get(ogi); o.n++; o.pages.push({ url, w: +one('og:image:width') || null, h: +one('og:image:height') || null, card: one('twitter:card') }); }
  }
  if (meta['twitter:image'] && ogi && one('twitter:image') !== ogi) add('twitter-image-differs');
  // document
  if (!(tags(raw, 'html')[0] ?? {}).lang) add('lang-missing');
  if (!links.some((l) => /icon/.test(l.rel ?? ''))) add('favicon-link-missing');
  if (!links.some((l) => l.rel === 'manifest' || (S.touchIconCountsAsManifest && l.rel === 'apple-touch-icon'))) add('manifest-missing');
  if ((rss || S.rssLinkRequired) && !links.some((l) => l.rel === 'alternate' && /rss|atom/.test(l.type ?? ''))) add('rss-link-missing');
  // headings
  if (h1s.length === 0) add('h1-missing'); else if (h1s.length > 1) add('h1-multiple', String(h1s.length));
  if (hs.length && hs[0].l !== 1) add('heading-first-not-h1', `h${hs[0].l}`);
  for (let k = 1; k < hs.length; k++) if (hs[k].l > hs[k - 1].l + 1) { add('heading-skip', `h${hs[k - 1].l}->h${hs[k].l}`); break; }
  // images
  const imgs = [...body.matchAll(new RegExp(`<img\\b${TAG_IN}>`, 'gi'))].map((m) => m[0]);
  const noAlt = imgs.filter((t) => !('alt' in attrs(t.slice(4)))); if (noAlt.length) add('img-no-alt', `${noAlt.length} (${attrs(noAlt[0].slice(4)).src ?? ''})`);
  if (KEY_IMG && (!KEY_IMG.types || rx(KEY_IMG.types).test(type))) {
    let key = null;
    if (KEY_IMG.find === 'phead') { const ph = (body.match(/<header class="phead[^"]*">([\s\S]*?)<\/header>/i)?.[1] ?? '').replace(/<div[^>]*aria-hidden="true"[\s\S]*?<\/div>/gi, ''); const k = ph.match(new RegExp(`<img\\b${TAG_IN}>`, 'i'))?.[0]; if (k && (!KEY_IMG.src || rx(KEY_IMG.src).test(k))) key = k; }
    else key = imgs.find((t) => /fetchpriority="high"|loading="eager"/.test(t));
    if (key && !(attrs(key.slice(4)).alt ?? '').trim()) add('key-img-empty-alt', attrs(key.slice(4)).src);
  }
  // visible breadcrumbs
  const bcNav = /<nav[^>]*aria-label="Breadcrumb"[^>]*>([\s\S]*?)<\/nav>/i.exec(body);
  const crumbs = bcNav ? [...bcNav[1].matchAll(/<(a|span)(\s[^>]*)?>([\s\S]*?)<\/\1>/g)].filter((m) => !/aria-hidden/.test(m[2] ?? '')).map((m) => ({ name: strip(m[3]), href: attrs(m[2] ?? '').href })).filter((c) => c.name) : null;
  // JSON-LD
  const nodes = [];
  for (const block of lds) {
    let j; try { j = JSON.parse(block); } catch (e) { add('jsonld-parse-error', e.message); continue; }
    if (block.includes('</')) add('jsonld-unescaped-close');
    for (const t of Array.isArray(j) ? j : [j]) { if (!t['@context'] || !/schema\.org/.test(JSON.stringify(t['@context']))) add('jsonld-no-context'); for (const n of t['@graph'] ?? [t]) nodes.push(n); }
  }
  const ts = (n) => [].concat(n?.['@type'] ?? []);
  p.ld = nodes.map((n) => ts(n).join('+'));
  const pageNodes = nodes.filter((n) => ts(n).some((t) => PAGE_TYPES.has(t)) && !ts(n).includes('FAQPage'));
  if (!light) {
    if (!pageNodes.length) add('jsonld-no-page-entity');
    if (url !== '/' && !nodes.some((n) => ts(n).includes('BreadcrumbList'))) add('jsonld-no-breadcrumb');
    if (!nodes.some((n) => ts(n).includes('WebSite'))) add('jsonld-no-website');
    if (!nodes.some((n) => ts(n).includes('Organization'))) add('jsonld-no-organization');
    // 'all': every page names the VideoGame; 'games': pages under a game in `games` name that game (its ldName)
    if (S.requireVideoGame === 'all' || (S.requireVideoGame === 'games' && game?.ldName)) { const s = JSON.stringify(nodes); if (!s.includes('"VideoGame"') || (game?.ldName && !s.includes(JSON.stringify(game.ldName)))) add('jsonld-no-videogame', game?.ldName); }
  }
  if (pageNodes.length > 1) add('jsonld-multiple-page-entities', pageNodes.map((n) => ts(n).join('+')).join(','));
  for (const t of ['WebSite', 'Organization', 'BreadcrumbList']) { const c = nodes.filter((n) => ts(n).includes(t)).length; if (c > 1) add('jsonld-duplicate', `${t} x${c}`); }
  const ids = new Map(); const defined = new Set(); const banned = new Set();
  const walk = (n) => {
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (!n || typeof n !== 'object') return;
    const t = ts(n);
    if (n['@id'] && t.length) { const prev = ids.get(n['@id']); if (prev && prev !== t.join('+')) add('jsonld-conflicting-id', n['@id']); ids.set(n['@id'], t.join('+')); }
    for (const ty of t) { if (BANNED.has(ty)) banned.add(ty); if (vocab ? !vocab.classes.has(ty) : KNOWN_TYPES && !KNOWN_TYPES.has(ty)) add('jsonld-unknown-type', ty); }
    for (const [k, v] of Object.entries(n)) {
      if (k.startsWith('@')) { if (k === '@id' && typeof v === 'string' && !/^https:\/\//.test(v)) add('jsonld-relative-url', `@id=${v}`); continue; }
      if (vocab && t.length) {
        const pr = vocab.props.get(k);
        if (!pr) { if (!GOOGLE_PROPS.has(k)) add('jsonld-unknown-property', `${t[0]}.${k}`); }
        else if (pr.superseded) add('jsonld-superseded-property', `${t[0]}.${k}`);
        else if (!t.some((ty) => vocab.classes.has(ty) && pr.domain.some((d) => vocab.up(ty).has(d)))) add('jsonld-property-not-on-type', `${t[0]}.${k}`);
      }
      if (URL_KEYS.has(k)) for (const s of [].concat(v)) if (typeof s === 'string' && !/^https:\/\//.test(s)) add('jsonld-relative-url', `${k}=${s}`);
      if (['image', 'logo', 'contentUrl'].includes(k)) for (const s of [].concat(v)) { const u = typeof s === 'string' ? s : s?.url; if (typeof u === 'string' && u.startsWith(ORIGIN + '/') && !fs.existsSync(path.join(DIST, decodeURIComponent(new URL(u).pathname)))) add('jsonld-image-missing', u); }
      if (typeof v === 'string' && /\bundefined\b|\[object/.test(v)) add('jsonld-undefined-value', k);
      if (v && typeof v === 'object') walk(v);
    }
  };
  walk(nodes);
  if (ids.size) for (const n of nodes) if (n['@id'] && Object.keys(n).length > 2) { if (defined.has(n['@id'])) add('jsonld-duplicate-id', n['@id']); defined.add(n['@id']); }
  if (banned.size) add('jsonld-banned-type', [...banned].join(','));
  for (const n of nodes) for (const t of ts(n)) for (const k of REQ[t] ?? []) if (n[k] == null) add('jsonld-missing-prop', `${t}.${k}`);
  for (const e of pageNodes) {
    if (!special && e.url && e.url !== self && e.url !== canonical) add('jsonld-page-url-differs', e.url);
    if (S.pageNameIsTitle && e.name && !ts(e).includes('BlogPosting') && e.name !== title) add('jsonld-page-name-differs', e.name);
    if (S.pageNodeContent !== false) {
      if (ts(e).includes('ItemPage') && !e.about && !e.mainEntity) add('jsonld-itempage-no-about');
      if (ts(e).includes('CollectionPage') && !e.mainEntity) add('jsonld-collection-no-itemlist');
    }
  }
  const faq = nodes.find((n) => ts(n).includes('FAQPage'));
  if (faq) { const vis = norm(strip(body)); for (const q of [].concat(faq.mainEntity ?? [])) if (!vis.includes(norm(q.name ?? '').slice(0, 60))) { add('jsonld-faq-not-visible', q.name); break; } }
  // breadcrumbs: visible trail vs BreadcrumbList
  const bl = nodes.find((n) => ts(n).includes('BreadcrumbList'));
  if (crumbs?.length && !bl) add('breadcrumb-ld-missing');
  if (bl) {
    const li = bl.itemListElement ?? [];
    li.forEach((x, k) => { if (x.position !== k + 1 || !x.name) add('breadcrumb-item-invalid', `${k + 1}`); else if (!x.item && k < li.length - 1) add('breadcrumb-item-invalid', `${k + 1} has no url`); });
    if (crumbs?.length) {
      const ldn = li.map((x) => norm(x.name ?? '')), vis = crumbs.map((c) => norm(c.name));
      const fits = (off) => { const v = off ? [ldn[0], ...vis] : vis; return (v.length === ldn.length || v.length === ldn.length - 1) && v.every((x, i) => x === ldn[i]); };
      const off = fits(0) ? 0 : fits(1) ? 1 : null;
      if (off == null) add('breadcrumb-mismatch', `${crumbs.map((c) => c.name).join(' > ')} | ${li.map((x) => x.name).join(' > ')}`);
      else if (CRUMBS.compareUrls) crumbs.forEach((c, k) => { const it = li[k + off]?.item; const iu = typeof it === 'object' ? it?.['@id'] : it; if (c.href && iu && iu !== new URL(c.href, ORIGIN + url).href) add('breadcrumb-url-differs', `${c.href} | ${iu}`); });
    } else if (CRUMBS.visibleMin != null && !light && url !== '/' && li.length >= CRUMBS.visibleMin) add('breadcrumb-visible-missing');
  } else if (!crumbs && CRUMBS.visibleMin != null && !light && url !== '/' && url.split('/').length - 1 >= CRUMBS.visibleMin) add('breadcrumb-visible-missing');
  // internal links
  const outs = new Set();
  for (const a of tags(body, 'a')) {
    const h = a.href; if (!h || /^(mailto:|tel:|javascript:|#)/i.test(h)) continue;
    let u; try { u = new URL(h, ORIGIN + url); } catch { add('link-bad-href', h); continue; }
    if (u.origin !== ORIGIN) { if (OTHER_HOST.test(u.host)) add('link-non-canonical-host', h); continue; }
    const pth = decodeURIComponent(u.pathname); outs.add(pth);
    const l = linkTargets.get(pth) ?? linkTargets.set(pth, []).get(pth); if (l.length < 5) l.push(url);
  }
  graph.set(url, outs);
}

// ---------- cross-page ----------
const dupTitles = [...titles].filter(([, u]) => u.length > 1).map(([t, u]) => ({ title: t, n: u.length, urls: u.slice(0, 10) })).sort((a, b) => b.n - a.n);
const dupDescs = [...descs].filter(([, u]) => u.length > 1).map(([d, u]) => ({ desc: d, n: u.length, urls: u.slice(0, 10) })).sort((a, b) => b.n - a.n);
for (const d of dupTitles) for (const u of titles.get(d.title)) pages[u].issues.push(`title-duplicate: ${d.n} pages`);
for (const d of dupDescs) for (const u of descs.get(d.desc)) pages[u].issues.push(`desc-duplicate: ${d.n} pages`);
// templated descriptions: blank the page's own name and every number; a skeleton shared by many pages reads the same
const TPL = { min: 5, perType: true, ...S.templated };
const skel = new Map();
for (const [u, p] of Object.entries(pages)) {
  if (!p.desc || p.noindex || p.special) continue;
  let s = p.desc; for (const n of [p.h1, p.title && stripBrand(p.title)].filter(Boolean).sort((a, b) => b.length - a.length)) s = s.split(n).join('{name}');
  s = s.replace(/\d[\d,.]*/g, '#'); if (TPL.normalize) s = norm(s);
  const k = (TPL.perType ? p.type : '') + '\u0000' + s; (skel.get(k) ?? skel.set(k, []).get(k)).push(u);
}
const templated = [];
for (const [k, us] of skel) if (us.length >= TPL.min) { const [t, s] = k.split('\u0000'); templated.push({ type: t || null, skeleton: s, n: us.length, examples: us.slice(0, 3) }); for (const u of us) if (!pages[u].issues.some((i) => i.startsWith('desc-duplicate'))) pages[u].issues.push(`desc-templated: ${us.length} pages`); }
templated.sort((a, b) => b.n - a.n);
// description openings per page type: the share of the most common first eight words
const openings = {};
for (const t of new Set(Object.values(pages).map((p) => p.type))) {
  const ps = Object.values(pages).filter((p) => p.type === t && !p.noindex && p.desc); if (ps.length < 5) continue;
  const c = new Map(); for (const p of ps) { const k = norm(p.h1 ? p.desc.split(p.h1).join(' ') : p.desc).replace(/\b\d+\b/g, '#').split(' ').slice(0, 8).join(' '); c.set(k, (c.get(k) ?? 0) + 1); }
  const [top, n] = [...c].sort((a, b) => b[1] - a[1])[0]; openings[t] = { pages: ps.length, distinct: c.size, top, share: +(n / ps.length).toFixed(2) };
}
// links: broken / redirecting, then click depth from home
const badLinks = [];
for (const [pth, from] of linkTargets) { const r = resolveLink(pth); if (r !== 'ok') { badLinks.push({ target: pth, result: r, from }); for (const f of from) pages[f]?.issues.push(`link-${r}: ${pth}`); } }
const depth = new Map([['/', 0]]); const q = ['/'];
while (q.length) { const u = q.shift(); for (const v of graph.get(u) ?? []) { const k = pages[v] ? v : pages[v + '/'] ? v + '/' : null; if (k && !depth.has(k)) { depth.set(k, depth.get(u) + 1); q.push(k); } } }
const MAX_DEPTH = S.maxDepth ?? 4; const depthHist = {}; const unreachable = []; const deep = [];
for (const [u, p] of Object.entries(pages)) {
  if (p.noindex || p.special || p.utility) continue;
  const d = depth.get(u); p.depth = d ?? null;
  if (d == null) { unreachable.push(u); p.issues.push('unreachable'); } else { depthHist[d] = (depthHist[d] ?? 0) + 1; if (d > MAX_DEPTH) { deep.push(u); p.issues.push(`deep: ${d} clicks`); } }
}
for (const s of sitemapUrls) {
  if (!s.startsWith(ORIGIN + '/')) { siteIssue('sitemap-off-origin', s); continue; }
  const u = s.slice(ORIGIN.length);
  if (S.sitemapTrailingSlash !== false && !u.endsWith('/') && !/\.\w+$/.test(u)) siteIssue('sitemap-no-trailing-slash', s);
  if (ON_DEMAND && ON_DEMAND.test(u)) continue;
  if (stubs.has(u)) siteIssue('sitemap-url-stub', s); else if (!pages[u]) siteIssue('sitemap-url-no-page', s);
}
for (const s of imagePages) { const u = s.replace(ORIGIN, ''); if (!pages[u]) siteIssue('image-sitemap-page-missing', s); else if (pages[u].noindex) siteIssue('image-sitemap-page-noindex', s); else if (!sitemapUrls.has(s)) siteIssue('image-sitemap-page-not-in-sitemap', s); }
// og:image: local file, real size against the declared size, card size; optional live fetch
const ogReport = [];
for (const [img, o] of ogImages) {
  const u = new URL(img); const local = u.origin === ORIGIN ? path.join(DIST, decodeURIComponent(u.pathname)) : null;
  const r = { img, pages: o.n, exists: !!local && fileExists(local), w: null, h: null, bytes: null };
  if (r.exists) { r.bytes = fs.statSync(local).size; if (sharp) try { const m = await sharp(local).metadata(); r.w = m.width; r.h = m.height; } catch { r.unreadable = true; } }
  ogReport.push(r);
  for (const pg of o.pages) {
    const I = pages[pg.url].issues;
    if (!r.exists) { I.push(`og-image-file-missing: ${img}`); continue; }
    if (r.unreadable) I.push(`og-image-unreadable: ${img}`);
    if (r.w == null) continue;
    if (r.w < 200 || r.h < 200) I.push(`og-image-small: ${r.w}x${r.h}`);
    if (pg.card === 'summary_large_image' && (r.w < 600 || r.h < 314)) I.push(`og-image-large-card-small: ${r.w}x${r.h}`);
    if (pg.w && (pg.w !== r.w || (pg.h && pg.h !== r.h))) I.push(`og-image-declared-size: ${pg.w}x${pg.h} vs ${r.w}x${r.h}`);
    if (r.bytes > 5e6) I.push(`og-image-over-5mb: ${img}`);
  }
}
let live = null;
if (LIVE > 0) {
  live = [];
  const all = ogReport.map((o) => o.img); const step = Math.max(1, Math.floor(all.length / LIVE));
  for (const img of all.filter((_, i) => i % step === 0).slice(0, LIVE)) {
    try { const r = await fetch(img, { method: 'GET' }); const b = Buffer.from(await r.arrayBuffer()); let dims = null; if (sharp) try { const m = await sharp(b).metadata(); dims = `${m.width}x${m.height}`; } catch { /* not an image */ } live.push({ img, status: r.status, type: r.headers.get('content-type'), bytes: b.length, dims }); }
    catch (e) { live.push({ img, error: e.message }); }
  }
}

// ---------- summary ----------
const codeOf = (i) => i.split(': ')[0];
const summary = {}; const byType = {}; const ldTypes = {}; const suffixes = {};
for (const p of Object.values(pages)) {
  const bt = byType[p.type] ??= { pages: 0, noindex: 0, issues: {}, ld: {}, titleLen: [Infinity, 0], descLen: [Infinity, 0] };
  bt.pages++; if (p.noindex) bt.noindex++;
  bt.titleLen = [Math.min(bt.titleLen[0], p.title?.length ?? 0), Math.max(bt.titleLen[1], p.title?.length ?? 0)];
  bt.descLen = [Math.min(bt.descLen[0], p.desc?.length ?? 0), Math.max(bt.descLen[1], p.desc?.length ?? 0)];
  for (const c of new Set(p.issues.map(codeOf))) { summary[c] = (summary[c] ?? 0) + 1; bt.issues[c] = (bt.issues[c] ?? 0) + 1; }
  for (const t of new Set(p.ld)) { bt.ld[t] = (bt.ld[t] ?? 0) + 1; ldTypes[t] = (ldTypes[t] ?? 0) + 1; }
  if (!p.noindex && p.title) { const m = p.title.match(/\s([·|–-])\s([^·|–-]+)$/); const k = m ? m[0].trim() : '(none)'; suffixes[k] = (suffixes[k] ?? 0) + 1; }
}
const siteCodes = {}; for (const s of siteIssues) siteCodes[codeOf(s)] = (siteCodes[codeOf(s)] ?? 0) + 1;
const len = (k) => { const v = Object.values(pages).filter((p) => !p.noindex && p[k]).map((p) => p[k].length).sort((a, b) => a - b); return { min: v[0], median: v[v.length >> 1], max: v[v.length - 1] }; };
const gateHits = GATE.size ? [...Object.entries(pages).flatMap(([u, p]) => p.issues.filter((i) => GATE.has(codeOf(i))).map((i) => `${u}: ${i}`)), ...siteIssues.filter((i) => GATE.has(codeOf(i)))] : [];
const report = {
  generatedAt: new Date().toISOString(), origin: ORIGIN, pageCount: Object.keys(pages).length, redirectStubs: stubs.size,
  indexable: Object.values(pages).filter((p) => !p.noindex && !p.special).length, sitemapUrls: sitemapUrls.size, imageSitemap, schemaVocab: !!vocab,
  site: siteIssues, siteCodes, summary: Object.fromEntries(Object.entries(summary).sort((a, b) => b[1] - a[1])),
  numbers: { duplicateTitleGroups: dupTitles.length, pagesWithDuplicateTitle: dupTitles.reduce((n, d) => n + d.n, 0), duplicateDescGroups: dupDescs.length, pagesWithDuplicateDesc: dupDescs.reduce((n, d) => n + d.n, 0), titleLength: len('title'), descLength: len('desc'), clickDepth: depthHist, unreachable: unreachable.length },
  titleSuffixes: suffixes, ldTypes: Object.fromEntries(Object.entries(ldTypes).sort((a, b) => b[1] - a[1])), byType, descriptionOpenings: openings,
  dupTitles: dupTitles.slice(0, 50), dupDescs: dupDescs.slice(0, 50), templated: templated.slice(0, 50), badLinks, unreachable: unreachable.slice(0, 100), deep: deep.slice(0, 50),
  ogImages: { distinct: ogReport.length, missing: ogReport.filter((o) => !o.exists).length, small: ogReport.filter((o) => o.w != null && (o.w < 200 || o.h < 200)).length, sample: ogReport.slice(0, 5), live },
  gate: GATE.size ? { codes: [...GATE], failures: gateHits.length, examples: gateHits.slice(0, 60) } : null,
  pages: Object.fromEntries(Object.entries(pages).filter(([, p]) => p.issues.length)),
};
if (OUT) { fs.mkdirSync(path.dirname(path.resolve(ROOT, OUT)), { recursive: true }); fs.writeFileSync(path.resolve(ROOT, OUT), JSON.stringify(report, null, 1)); }
console.log(`seo-audit ${ORIGIN}: pages ${report.pageCount} (indexable ${report.indexable}${stubs.size ? `, redirect stubs ${stubs.size}` : ''}), sitemap ${report.sitemapUrls}, image sitemap ${imageSitemap.pages} pages/${imageSitemap.images} images, schema.org vocabulary ${vocab ? 'on' : 'off'}`);
console.log('site:', siteIssues.length ? siteIssues.slice(0, 12) : 'ok');
console.log('numbers:', JSON.stringify(report.numbers));
console.log('og images:', JSON.stringify({ ...report.ogImages, sample: undefined, live: undefined }), live ? JSON.stringify(live) : '');
console.log('pages per issue:'); for (const [k, v] of Object.entries(report.summary)) console.log(`  ${String(v).padStart(5)}  ${k}`);
console.log('json-ld types (pages):', JSON.stringify(report.ldTypes));
if (templated.length) { console.log('top templated descriptions:'); for (const t of templated.slice(0, 8)) console.log(`  ${t.n}  ${t.type ? `[${t.type}] ` : ''}${t.skeleton.slice(0, 120)}`); }
if (dupTitles.length) { console.log('top duplicate titles:'); for (const t of dupTitles.slice(0, 8)) console.log(`  ${t.n}  ${t.title}`); }
console.log('bad links:', badLinks.length, JSON.stringify(badLinks.slice(0, 8)));
if (OUT) console.log(`report: ${OUT}`);
if (GATE.size) {
  console.log(`gate (${[...GATE].join(', ')}): ${gateHits.length} failures`);
  for (const e of gateHits.slice(0, 60)) console.log('  ERROR ' + e);
  if (gateHits.length) process.exitCode = 1;
}
