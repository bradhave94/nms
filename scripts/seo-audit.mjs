// SEO audit over a production build: every HTML page in dist/client/ plus the sitemap, robots.txt and RSS.
// Run `pnpm run build` first. Astro redirect stubs (meta refresh pages for legacy URLs) are counted as
// redirects, not pages; /alliances is rendered on demand, so links to it count as fine.
// Usage: node scripts/seo-audit.mjs [--out report.json] [--vocab schemaorg-current-https.jsonld] [--live]
//   --vocab  schema.org vocabulary (https://schema.org/version/latest/schemaorg-current-https.jsonld) to check
//            JSON-LD types and properties; without it only syntax, URLs and required properties are checked.
//   --live   also fetch a sample of og:image URLs from the live site.
// Prints a summary; exit code is always 0 (it is a report, not a gate).
/* eslint-disable no-console -- a report script: it prints its summary */
/* global URL, fetch */
import fs from 'node:fs'; import path from 'node:path';
import sharp from 'sharp';

const SITE = 'https://nomansskyrecipes.com';
const BRAND = " | No Man's Sky Recipes";
const GAME = /No Man['’]?s Sky|\bNMS\b/i;
const DIST = path.resolve('dist/client');
// prerender = false routes: no HTML in dist, served by the Worker.
const ON_DEMAND = /^\/alliances(\/|$)/;
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const OUT = arg('--out'); const VOCAB = arg('--vocab'); const LIVE = process.argv.includes('--live');

// ---------- helpers ----------
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'", nbsp: ' ' };
const dec = (s = '') => s.replace(/&(#?\w+);/g, (m, e) => ENT[e] ?? (e[0] === '#' ? String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1)) : m));
const strip = (s) => dec(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const attrs = (s) => { const o = {}; for (const m of s.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) o[m[1].toLowerCase()] = dec(m[2] ?? m[3] ?? m[4] ?? ''); return o; };
const tags = (html, name) => [...html.matchAll(new RegExp(`<${name}(\\s[^>]*)?\\/?>`, 'gi'))].map((m) => attrs(m[1] ?? ''));
const norm = (s) => s.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();

const files = []; (function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (f.name.endsWith('.html')) files.push(p); } })(DIST);
const urlOf = (f) => { const r = path.relative(DIST, f).split(path.sep).join('/'); return '/' + (r === 'index.html' ? '' : r.endsWith('/index.html') ? r.slice(0, -10) : r); };
const typeOf = (u) => {
  if (u === '/') return 'home';
  const s = u.split('/').filter(Boolean);
  if (s.length === 1) return s[0].endsWith('.html') ? s[0] : `${s[0]}/`;
  if (s[0] === 'blog') return 'blog/[slug]';
  if (/^\d+$/.test(s[1])) return `${s[0]}/[page]`;
  if (s[0] === 'calculator' || s[1] === 'cards' || s[1] === 'affinities') return `${s[0]}/${s[1]}/`;
  return `${s[0]}/[id]`;
};

// ---------- redirects: vercel.json, plus Astro meta-refresh stubs found while reading pages ----------
const stubs = new Map();
const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const redirects = (vercel.redirects || []).map((r) => ({ ...r, rx: new RegExp('^' + r.source.replace(/[.+?^${}()|[\]\\]/g, (c) => (c === '(' || c === ')' || c === '|' ? c : '\\' + c)).replace(/:\w+\*/g, '.*').replace(/:\w+/g, '[^/]+') + '/?$') }));

// ---------- sitemap ----------
const sitemapUrls = new Set(); const sitemapIssues = [];
const idx = fs.existsSync(path.join(DIST, 'sitemap-index.xml')) ? fs.readFileSync(path.join(DIST, 'sitemap-index.xml'), 'utf8') : '';
if (!idx) sitemapIssues.push('no sitemap-index.xml');
const robotsTxt = fs.existsSync(path.join(DIST, 'robots.txt')) ? fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8') : '';
const sitemapFiles = [...new Set([...idx.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).concat([...robotsTxt.matchAll(/^Sitemap:\s*(\S+)/gm)].map((m) => m[1]).filter((u) => !/sitemap-index\.xml$/.test(u))))]
  // the alliance sitemap is rendered on demand, so it has no file in dist
  .filter((u) => !ON_DEMAND.test(new URL(u).pathname));
const imageSitemap = { pages: 0, images: 0 };
for (const s of sitemapFiles) {
  const local = path.join(DIST, new URL(s).pathname);
  if (!fs.existsSync(local)) { sitemapIssues.push(`sitemap file missing: ${s}`); continue; }
  const xml = fs.readFileSync(local, 'utf8');
  if (!/^<\?xml/.test(xml) || !/<urlset/.test(xml)) sitemapIssues.push(`not a urlset: ${s}`);
  const isImage = /<image:image>/.test(xml) && /image/i.test(s);
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = dec(/<loc>([^<]+)<\/loc>/.exec(m[1])?.[1] ?? '');
    if (isImage) { imageSitemap.pages++; imageSitemap.images += (m[1].match(/<image:image>/g) || []).length; imageSitemap.locs ??= []; imageSitemap.locs.push(loc); for (const im of m[1].matchAll(/<image:loc>([^<]+)<\/image:loc>/g)) if (!fs.existsSync(path.join(DIST, decodeURIComponent(new URL(dec(im[1])).pathname)))) sitemapIssues.push(`image sitemap image missing: ${im[1]}`); continue; }
    sitemapUrls.add(loc);
  }
}
const imageSitemapUrls = new Set();
for (const s of sitemapFiles) { const xml = fs.readFileSync(path.join(DIST, new URL(s).pathname), 'utf8'); if (/<image:image>/.test(xml)) for (const m of xml.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)) imageSitemapUrls.add(dec(m[1])); }

// ---------- robots / rss ----------
const robots = fs.existsSync(path.join(DIST, 'robots.txt')) ? fs.readFileSync(path.join(DIST, 'robots.txt'), 'utf8') : '';
const siteIssues = [...sitemapIssues];
if (!robots) siteIssues.push('no robots.txt');
else {
  if (!/^Sitemap:\s*https:\/\/nomansskyrecipes\.com\/sitemap-index\.xml\s*$/m.test(robots)) siteIssues.push('robots.txt: no absolute Sitemap line for sitemap-index.xml');
  if (/^Disallow:\s*\/\s*$/m.test(robots)) siteIssues.push('robots.txt disallows everything');
}
const rss = fs.existsSync(path.join(DIST, 'blog/rss.xml')) ? fs.readFileSync(path.join(DIST, 'blog/rss.xml'), 'utf8') : '';
if (!rss) siteIssues.push('no /blog/rss.xml'); else if (!/<rss[\s\S]*<channel>/.test(rss)) siteIssues.push('rss.xml is not RSS');
for (const l of [...rss.matchAll(/<link>([^<]+)<\/link>/g)].map((m) => m[1])) if (!l.startsWith(SITE + '/')) siteIssues.push(`rss link not on canonical host: ${l}`);
if (!fs.existsSync(path.join(DIST, 'favicon.ico'))) siteIssues.push('no favicon.ico');

// ---------- schema.org vocabulary ----------
let vocab = null;
if (VOCAB && fs.existsSync(VOCAB)) {
  const g = JSON.parse(fs.readFileSync(VOCAB, 'utf8'))['@graph'];
  const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]).map((y) => (y['@id'] ?? y).replace(/^schema:/, ''));
  const classes = new Map(), props = new Map();
  for (const n of g) {
    const t = arr(n['@type']); const id = n['@id'].replace(/^schema:/, '');
    if (t.includes('rdfs:Class')) classes.set(id, arr(n['rdfs:subClassOf']));
    if (t.includes('rdf:Property')) props.set(id, { domain: arr(n['schema:domainIncludes']), superseded: !!n['schema:supersededBy'] });
  }
  const anc = new Map(); const up = (c) => { if (anc.has(c)) return anc.get(c); const s = new Set([c]); anc.set(c, s); for (const p of classes.get(c) || []) for (const a of up(p)) s.add(a); return s; };
  vocab = { classes, props, up };
}
// WebPage and its subtypes (FAQPage is counted apart: it sits next to the page node when a post has a visible FAQ)
const PAGE_TYPES = new Set(['WebPage', 'ItemPage', 'CollectionPage', 'AboutPage', 'SearchResultsPage', 'ProfilePage', 'QAPage', 'ContactPage']);
const GOOGLE_PROPS = new Set(['query-input']); // used by Google, not in the schema.org vocabulary

// ---------- per page ----------
const pages = {}; const titles = new Map(); const descs = new Map(); const linkTargets = new Map(); const graph = new Map(); const ogImages = new Map();
const FILLER = /\b(delve|comprehensive|ultimate guide|everything you need|dive into|unlock the secrets|seamless|embark|look no further|whether you're|in this article|elevate|treasure trove|game-changer|tapestry|in the realm of|must-have|unleash)\b/i;
const BAD = /\bundefined\b|\bnull\b|\bNaN\b|\[object|\s{2,}|^\s*[–·:-]|[–·:-]\s*$/;
const fileExists = (p) => { try { return fs.statSync(p).isFile(); } catch { return false; } };
function resolveLink(u) {
  if (ON_DEMAND.test(u)) return u.endsWith('/') || /\.\w+$/.test(u) ? 'ok' : 'redirect (no trailing slash)';
  if (stubs.has(u) || stubs.has(u + '/')) return 'redirect (legacy stub)';
  if (fileExists(path.join(DIST, u))) return 'ok';
  if (u.endsWith('/') && fileExists(path.join(DIST, u, 'index.html'))) return 'ok';
  if (!u.endsWith('/') && fileExists(path.join(DIST, u, 'index.html'))) return 'redirect (no trailing slash)';
  if (redirects.some((r) => r.rx.test(u))) return 'redirect (vercel.json)';
  return '404';
}

for (const f of files) {
  const raw = fs.readFileSync(f, 'utf8'); const url = urlOf(f); const type = typeOf(url);
  // Astro.redirect() in a static route writes a meta-refresh stub (noindex); treat it as a redirect, not a page
  const refresh = /<meta http-equiv="refresh" content="\d+;url=([^"]+)"/i.exec(raw.slice(0, 600));
  if (refresh) { stubs.set(url, dec(refresh[1])); continue; }
  const lds = [...raw.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const html = raw.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<template[\s\S]*?<\/template>|<!--[\s\S]*?-->/g, '');
  const head = html.slice(0, html.indexOf('</head>') + 1 || 0);
  const body = html.slice(html.indexOf('<body'));
  const I = []; const add = (k, d) => I.push(d ? `${k}: ${d}` : k);
  const meta = {}; for (const m of tags(head, 'meta')) { const k = m.property || m.name; if (k) (meta[k] ??= []).push(m.content ?? ''); }
  const one = (k) => meta[k]?.[0];
  const links = tags(head, 'link');
  const titleM = [...head.matchAll(/<title>([\s\S]*?)<\/title>/g)];
  const title = titleM.length ? dec(titleM[0][1]).trim() : null;
  const desc = one('description') ?? null;
  const robotsMeta = one('robots') ?? '';
  const noindex = /noindex/i.test(robotsMeta);
  const canonical = links.find((l) => l.rel === 'canonical')?.href ?? null;
  const p = pages[url] = { type, title, desc, noindex, canonical, issues: I, ld: [] };
  if (url.endsWith('.html') && url !== '/404.html') add('non-directory html file');
  if (url === '/404.html') { p.special = '404'; }

  // title
  if (!title) add('title missing'); else {
    if (titleM.length > 1) add('title multiple');
    const core = title.endsWith(BRAND) ? title.slice(0, -BRAND.length) : title;
    if (!GAME.test(title)) add('title without game name');
    // the brand may be left off a title that already names the game when the suffix would push it past 60
    if (!title.endsWith(BRAND) && url !== '/' && !(GAME.test(title) && (title + BRAND).length > 60)) add('title brand suffix inconsistent');
    if (BAD.test(core) || BAD.test(title)) add('title has empty/undefined part', title);
    if (title.length < 30) add('title short (<30)'); if (title.length > 60) add('title long (>60)');
    if (!noindex) (titles.get(title) ?? titles.set(title, []).get(title)).push(url);
  }
  // description
  if (!desc) add('description missing'); else {
    if (desc.length < 70) add('description short (<70)'); if (desc.length > 160) add('description long (>160)');
    if (/…["”]?$/.test(desc.trim())) add('description ends with a quoted excerpt (…)');
    else if (!/[.!?)"”]$/.test(desc.trim())) add('description truncated/no end punctuation');
    if (BAD.test(desc)) add('description has empty/undefined part');
    const dm = desc.match(FILLER); if (dm && !new RegExp(dm[0], 'i').test(strip(/<h1[^>]*>([\s\S]*?)<\/h1>/.exec(body)?.[1] ?? ''))) add('description filler words', dm[0]);
    if (!noindex) (descs.get(desc) ?? descs.set(desc, []).get(desc)).push(url);
  }
  // canonical
  const self = SITE + url;
  if (!canonical && !p.special) add('canonical missing');
  if (canonical) {
    if (!canonical.startsWith(SITE + '/')) add('canonical not https on canonical host');
    if (!canonical.endsWith('/')) add('canonical no trailing slash');
    if (canonical !== self) add('canonical not self-referencing', canonical);
  }
  // robots
  if (robotsMeta && !noindex && !/index|follow|max-/.test(robotsMeta)) add('robots meta odd', robotsMeta);
  if (noindex && sitemapUrls.has(self)) add('noindex page in sitemap');
  if (!noindex && !p.special && canonical === self && !sitemapUrls.has(self)) add('indexable page missing from sitemap');
  // OG / twitter
  for (const k of ['og:title', 'og:description', 'og:url', 'og:image', 'og:type', 'og:site_name', 'og:image:width', 'og:image:height', 'og:image:alt', 'og:locale', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) if (!one(k) && !(p.special && k === 'og:url')) add(`${k} missing`);
  if (one('og:title') && title && one('og:title') !== title && one('og:title') + BRAND !== title) add('og:title differs from title');
  if (one('og:description') && desc && one('og:description') !== desc) add('og:description differs from description');
  if (one('twitter:title') && one('og:title') && one('twitter:title') !== one('og:title')) add('twitter:title differs from og:title');
  if (one('twitter:description') && desc && one('twitter:description') !== desc) add('twitter:description differs');
  if (one('og:url') && canonical && one('og:url') !== canonical) add('og:url differs from canonical');
  if (type === 'blog/[slug]' && one('og:type') !== 'article') add('og:type not article on post');
  if (type === 'blog/[slug]' && !one('article:published_time')) add('article:published_time missing');
  const ogi = one('og:image');
  if (ogi) {
    if (!/^https:\/\//.test(ogi)) add('og:image not absolute');
    if (!ogImages.has(ogi)) ogImages.set(ogi, { n: 0, w: one('og:image:width'), h: one('og:image:height'), card: one('twitter:card'), sample: url }); ogImages.get(ogi).n++;
  }
  if (meta['twitter:image'] && one('twitter:image') !== ogi) add('twitter:image differs from og:image');
  // document
  const htmlTag = tags(raw, 'html')[0] || {}; if (!htmlTag.lang) add('html lang missing');
  if (!links.some((l) => /icon/.test(l.rel || ''))) add('favicon link missing');
  if (!links.some((l) => l.rel === 'manifest')) add('manifest link missing');
  if (rss && !links.some((l) => l.rel === 'alternate' && /rss/.test(l.type || ''))) add('rss alternate link missing');
  // headings
  const hs = [...body.matchAll(/<h([1-6])(\s[^>]*)?>([\s\S]*?)<\/h\1>/g)].map((m) => ({ l: +m[1], t: strip(m[3]) }));
  const h1s = hs.filter((h) => h.l === 1);
  p.h1 = h1s[0]?.t ?? null;
  if (h1s.length === 0) add('h1 missing'); else if (h1s.length > 1) add('h1 multiple', String(h1s.length));
  if (hs.length && hs[0].l !== 1) add('first heading is not h1');
  for (let k = 1; k < hs.length; k++) if (hs[k].l > hs[k - 1].l + 1) { add('heading level skipped', `h${hs[k - 1].l}->h${hs[k].l}`); break; }
  if (p.h1 && title) {
    const a = norm(p.h1), b = norm(title.replace(BRAND, ''));
    const tw = new Set(b.split(' ')); const hw = a.split(' ').filter(Boolean);
    if (!b.includes(a) && !a.includes(b) && hw.filter((w) => tw.has(w)).length / hw.length < 0.6) add('h1 disagrees with title', `${p.h1} | ${title}`);
    else if (!b.startsWith(a.split(' ').slice(0, 2).join(' ')) && !b.includes(a)) add('title does not lead with h1');
  }
  // images
  for (const im of tags(body, 'img')) if (!('alt' in im)) { add('img without alt attribute', im.src); break; }
  // breadcrumbs (visible)
  const bc = /<nav[^>]*aria-label="Breadcrumb"[^>]*>([\s\S]*?)<\/nav>/.exec(body);
  const crumbs = bc ? [...bc[1].matchAll(/<(a|span)(\s[^>]*)?>([^<]*)<\/\1>/g)].filter((m) => !/aria-hidden/.test(m[2] || '')).map((m) => ({ name: dec(m[3]).trim(), href: attrs(m[2] || '').href })) : [];
  // JSON-LD
  const nodes = [];
  for (const block of lds) {
    let j; try { j = JSON.parse(block); } catch (e) { add('json-ld parse error', e.message); continue; }
    if (block.includes('</')) add('json-ld contains unescaped </');
    const top = Array.isArray(j) ? j : [j];
    for (const t of top) { if (!t['@context'] || !/schema\.org/.test(JSON.stringify(t['@context']))) add('json-ld missing @context'); for (const n of t['@graph'] ?? [t]) nodes.push(n); }
  }
  const ts = (n) => [].concat(n['@type'] ?? []);
  p.ld = nodes.map((n) => ts(n).join('+'));
  const pageNodes = nodes.filter((n) => ts(n).some((t) => PAGE_TYPES.has(t)));
  if (!p.special && !pageNodes.length) add('json-ld no WebPage-type entity');
  if (url !== '/' && !p.special && !nodes.some((n) => ts(n).includes('BreadcrumbList'))) add('json-ld no BreadcrumbList');
  if (pageNodes.length > 1) add('json-ld multiple page entities', pageNodes.map((n) => ts(n).join('+')).join(','));
  for (const t of ['WebSite', 'Organization', 'BreadcrumbList']) { const c = nodes.filter((n) => ts(n).includes(t)).length; if (c > 1) add(`json-ld duplicate ${t}`, String(c)); }
  if (!p.special && !nodes.some((n) => ts(n).includes('WebSite'))) add('json-ld no WebSite');
  if (!p.special && !nodes.some((n) => ts(n).includes('Organization'))) add('json-ld no Organization');
  const ids = new Map();
  const walk = (n, where, depth) => {
    if (Array.isArray(n)) { n.forEach((x) => walk(x, where, depth)); return; }
    if (!n || typeof n !== 'object') return;
    const t = ts(n);
    if (n['@id'] && t.length) { const prev = ids.get(n['@id']); if (prev && prev !== t.join('+')) add('json-ld conflicting @id', n['@id']); ids.set(n['@id'], t.join('+')); }
    if (vocab) for (const ty of t) if (!vocab.classes.has(ty)) add('json-ld unknown type', ty);
    for (const [k, v] of Object.entries(n)) {
      if (k.startsWith('@')) { if (k === '@id' && typeof v === 'string' && !/^https?:\/\//.test(v)) add('json-ld relative @id', v); continue; }
      if (vocab && t.length) {
        const pr = vocab.props.get(k);
        if (!pr) { if (!GOOGLE_PROPS.has(k)) add('json-ld unknown property', `${t[0]}.${k}`); }
        else if (pr.superseded) add('json-ld superseded property', `${t[0]}.${k}`);
        else if (!t.some((ty) => vocab.classes.has(ty) && pr.domain.some((d) => vocab.up(ty).has(d)))) add('json-ld property not valid on type', `${t[0]}.${k}`);
      }
      if (['url', 'item', 'image', 'logo', 'sameAs', 'contentUrl', 'thumbnailUrl', 'mainEntityOfPage'].includes(k)) for (const s of [].concat(v)) if (typeof s === 'string' && !/^https?:\/\//.test(s)) add('json-ld relative url', `${k}=${s}`);
      if (typeof v === 'string' && /\bundefined\b|\[object/.test(v)) add('json-ld undefined value', k);
      if (typeof v === 'object') walk(v, where, depth + 1);
    }
  };
  walk(nodes, url, 0);
  const req = { BreadcrumbList: ['itemListElement'], ItemList: ['itemListElement'], Organization: ['name', 'url'], WebSite: ['name', 'url'], BlogPosting: ['headline', 'image', 'datePublished', 'author'], ItemPage: ['name', 'url'], CollectionPage: ['name', 'url'], WebPage: ['name', 'url'], FAQPage: ['mainEntity'], VideoGame: ['name'] };
  for (const n of nodes) for (const t of ts(n)) for (const k of req[t] || []) if (n[k] == null) add('json-ld missing required property', `${t}.${k}`);
  const bl = nodes.find((n) => ts(n).includes('BreadcrumbList'));
  if (crumbs.length && !bl) add('visible breadcrumbs without BreadcrumbList');
  if (bl) {
    const li = bl.itemListElement || [];
    li.forEach((x, k) => { if (x.position !== k + 1) add('breadcrumb position wrong'); if (!x.name) add('breadcrumb item without name'); if (!x.item && k < li.length - 1) add('breadcrumb item without url'); });
    if (crumbs.length) {
      const vis = crumbs.map((c) => c.name).join(' > '), ldn = li.map((x) => x.name).join(' > ');
      if (vis !== ldn) add('BreadcrumbList names differ from visible', `${vis} | ${ldn}`);
      crumbs.forEach((c, k) => { if (c.href && li[k] && li[k].item !== new URL(c.href, SITE).href) add('BreadcrumbList url differs from visible', `${c.href} | ${li[k].item}`); });
    }
  }
  const faq = nodes.find((n) => ts(n).includes('FAQPage'));
  if (faq) for (const q of [].concat(faq.mainEntity || [])) if (!norm(strip(body)).includes(norm(q.name || ''))) { add('FAQPage question not visible on page', q.name); break; }
  // Recipe/NutritionInformation are for food, Speakable for news publishers; none fit a game database
  const misused = new Set(); const scan = (n) => { if (Array.isArray(n)) return n.forEach(scan); if (!n || typeof n !== 'object') return; for (const t of ts(n)) if (['Recipe', 'NutritionInformation', 'HowTo', 'SpeakableSpecification'].includes(t)) misused.add(t); Object.values(n).forEach(scan); };
  scan(nodes); if (misused.size) add('json-ld Recipe/HowTo/Speakable used', [...misused].join(','));
  if (!p.special && !nodes.some((n) => ts(n).includes('VideoGame'))) add('json-ld no VideoGame');
  // internal links
  const out = new Set();
  for (const a of tags(body, 'a')) {
    const h = a.href; if (!h || /^(mailto:|javascript:|#)/.test(h)) continue;
    let u; try { u = new URL(h, SITE + url); } catch { add('bad href', h); continue; }
    if (u.origin !== SITE) { if (/nomansskyrecipes\.com/.test(u.host)) add('internal link to non-canonical host', h); continue; }
    const pth = decodeURIComponent(u.pathname); out.add(pth);
    const l = linkTargets.get(pth) ?? linkTargets.set(pth, []).get(pth); if (l.length < 5) l.push(url);
  }
  graph.set(url, out);
}

// ---------- cross-page ----------
const dupTitles = [...titles].filter(([, u]) => u.length > 1).map(([t, u]) => ({ title: t, n: u.length, urls: u.slice(0, 10) })).sort((a, b) => b.n - a.n);
const dupDescs = [...descs].filter(([, u]) => u.length > 1).map(([d, u]) => ({ desc: d, n: u.length, urls: u.slice(0, 10) })).sort((a, b) => b.n - a.n);
for (const d of dupTitles) for (const u of titles.get(d.title)) pages[u].issues.push('title duplicate');
for (const d of dupDescs) for (const u of descs.get(d.desc)) pages[u].issues.push('description duplicate');
// templated descriptions: strip the page's own name and every number, then count identical skeletons per page type
const skel = {};
for (const [u, p] of Object.entries(pages)) {
  if (!p.desc || p.noindex) continue;
  let s = p.desc; if (p.h1) s = s.split(p.h1).join('<name>');
  s = s.replace(/\d[\d,.]*/g, '#');
  ((skel[p.type] ??= {})[s] ??= []).push(u);
}
const templated = [];
for (const [t, m] of Object.entries(skel)) for (const [s, u] of Object.entries(m)) if (u.length >= 5) { templated.push({ type: t, skeleton: s, n: u.length }); for (const x of u) pages[x].issues.push('description templated (same skeleton as 5+ pages)'); }
templated.sort((a, b) => b.n - a.n);
// broken / redirecting links
const badLinks = [];
for (const [pth, from] of linkTargets) { const r = resolveLink(pth); if (r !== 'ok') { badLinks.push({ target: pth, result: r, from }); for (const f of from) pages[f]?.issues.push(`internal link ${r}`); } }
// click depth from home (html pages only)
const depth = new Map([['/', 0]]); const q = ['/'];
while (q.length) { const u = q.shift(); for (const v of graph.get(u) || []) { const k = pages[v] ? v : pages[v + '/'] ? v + '/' : null; if (k && !depth.has(k)) { depth.set(k, depth.get(u) + 1); q.push(k); } } }
const depthHist = {}; const deep = [], unreachable = [];
for (const [u, p] of Object.entries(pages)) { if (p.noindex || p.special) continue; const d = depth.get(u); if (d == null) { unreachable.push(u); p.issues.push('not reachable from home'); } else { depthHist[d] = (depthHist[d] ?? 0) + 1; if (d > 4) { deep.push(u); p.issues.push('more than 4 clicks from home'); } } }
for (const s of sitemapUrls) { const u = s.replace(SITE, ''); if (ON_DEMAND.test(u)) continue; if (stubs.has(u)) siteIssues.push(`sitemap url is a redirect stub: ${s}`); else if (!pages[u]) siteIssues.push(`sitemap url has no page: ${s}`); }
for (const s of imageSitemap.locs ?? []) if (!sitemapUrls.has(s)) siteIssues.push(`image sitemap page not in sitemap: ${s}`);
delete imageSitemap.locs;
// og images: local size; live fetch sample
const ogReport = [];
for (const [img, o] of ogImages) {
  const local = path.join(DIST, decodeURIComponent(new URL(img).pathname)); let w = null, h = null, exists = fileExists(local);
  if (exists) { try { const m = await sharp(local).metadata(); w = m.width; h = m.height; } catch { /* unreadable image */ } }
  ogReport.push({ img, pages: o.n, exists, w, h, declared: o.w ? `${o.w}x${o.h}` : null, card: o.card });
}
const ogByUrl = new Map(ogReport.map((o) => [o.img, o]));
const ogSmall = ogReport.filter((o) => o.w != null && (o.w < 200 || o.h < 200));
const ogLarge = ogReport.filter((o) => o.card === 'summary_large_image' && o.w != null && o.w < 600);
const ogMissing = ogReport.filter((o) => !o.exists);
for (const [u, p] of Object.entries(pages)) {
  const raw = fs.readFileSync(path.join(DIST, u === '/' ? 'index.html' : u.endsWith('/') ? u + 'index.html' : u), 'utf8').match(/property="og:image" content="([^"]+)"/)?.[1];
  const o = raw && ogByUrl.get(dec(raw));
  if (o && o.w != null && (o.w < 200 || o.h < 200)) p.issues.push('og:image too small (<200px)');
  if (o && o.card === 'summary_large_image' && o.w != null && o.w < 600) p.issues.push('large card with small image');
  if (o && !o.exists) p.issues.push('og:image file not in dist');
  if (o && o.declared && o.w && o.declared !== `${o.w}x${o.h}`) p.issues.push('og:image declared size wrong');
}
let live = null;
if (LIVE) {
  live = [];
  for (const o of ogReport.sort(() => Math.random() - 0.5).slice(0, 8)) {
    try { const r = await fetch(o.img, { method: 'GET' }); const b = Buffer.from(await r.arrayBuffer()); let dims = null; try { const m = await sharp(b).metadata(); dims = `${m.width}x${m.height}`; } catch { /* not an image */ } live.push({ img: o.img, status: r.status, type: r.headers.get('content-type'), bytes: b.length, dims }); }
    catch (e) { live.push({ img: o.img, error: e.message }); }
  }
}

// ---------- summary ----------
const summary = {}; const byType = {};
for (const p of Object.values(pages)) {
  const bt = byType[p.type] ??= { pages: 0, checks: {}, ld: {} }; bt.pages++;
  for (const i of new Set(p.issues.map((x) => x.split(': ')[0]))) { summary[i] = (summary[i] ?? 0) + 1; bt.checks[i] = (bt.checks[i] ?? 0) + 1; }
  for (const t of new Set(p.ld)) bt.ld[t] = (bt.ld[t] ?? 0) + 1;
}
const ldTypes = {}; for (const p of Object.values(pages)) for (const t of new Set(p.ld)) ldTypes[t] = (ldTypes[t] ?? 0) + 1;
const len = (k) => { const v = Object.values(pages).filter((p) => !p.noindex && p[k]).map((p) => p[k].length).sort((a, b) => a - b); return { min: v[0], median: v[v.length >> 1], max: v[v.length - 1] }; };
const report = {
  generatedAt: new Date().toISOString(), pageCount: Object.keys(pages).length, redirectStubs: stubs.size, indexable: Object.values(pages).filter((p) => !p.noindex && !p.special).length, sitemapUrls: sitemapUrls.size, imageSitemap,
  site: siteIssues, summary: Object.fromEntries(Object.entries(summary).sort((a, b) => b[1] - a[1])),
  numbers: { duplicateTitleGroups: dupTitles.length, pagesWithDuplicateTitle: dupTitles.reduce((n, d) => n + d.n, 0), duplicateDescGroups: dupDescs.length, pagesWithDuplicateDesc: dupDescs.reduce((n, d) => n + d.n, 0), titleLength: len('title'), descLength: len('desc'), clickDepth: depthHist, unreachable: unreachable.length },
  ldTypes: Object.fromEntries(Object.entries(ldTypes).sort((a, b) => b[1] - a[1])), byType,
  dupTitles, dupDescs: dupDescs.slice(0, 50), templated, badLinks, unreachable: unreachable.slice(0, 100), deep: deep.slice(0, 50),
  ogImages: { distinct: ogReport.length, small: ogSmall.length, largeCardSmallImage: ogLarge.length, missing: ogMissing.length, sample: ogReport.slice(0, 5), live },
  pages,
};
if (OUT) fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
console.log(`pages ${report.pageCount} (indexable ${report.indexable}, redirect stubs ${report.redirectStubs}), sitemap ${report.sitemapUrls}, image sitemap ${imageSitemap.pages} pages/${imageSitemap.images} images`);
console.log('site:', siteIssues.length ? siteIssues.slice(0, 10) : 'ok');
console.log('numbers:', JSON.stringify(report.numbers));
console.log('og images:', JSON.stringify({ ...report.ogImages, sample: undefined, live: undefined }), live ? JSON.stringify(live) : '');
console.log('summary (pages per issue):'); for (const [k, v] of Object.entries(report.summary)) console.log(`  ${String(v).padStart(5)}  ${k}`);
console.log('json-ld types (pages):', JSON.stringify(report.ldTypes));
console.log('top templated descriptions:'); for (const t of templated.slice(0, 12)) console.log(`  ${t.n}  [${t.type}] ${t.skeleton}`);
console.log('top duplicate titles:'); for (const t of dupTitles.slice(0, 8)) console.log(`  ${t.n}  ${t.title}`);
console.log('bad links:', badLinks.length, JSON.stringify(badLinks.slice(0, 8)));
