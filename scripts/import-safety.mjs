import { createHash, randomUUID } from 'node:crypto';
import { readFile, readdir, cp, mkdir, rename, open, unlink, stat, realpath } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export const tables = 'Buildings ConstructedTechnology Food Corvette Curiosities EggModifiers Exocraft Fish NutrientProcessor Others Products RawMaterials Refinery Starships Technology TechnologyModule Trade Upgrades Creatures'.split(' ').map(n => `${n}.json`);
const ignored = new Set(['new.json', 'localization.json', 'extraction-manifest.json', 'controllerLookup.generated.json', 'manifest.json']);
const hash = buffer => createHash('sha256').update(buffer).digest('hex');
const direct = name => typeof name === 'string' && name === path.basename(name) && !/[\\/:]/.test(name) && name !== '.' && name !== '..';
const exists = async p => { try { await stat(p); return true; } catch { return false; } };
export function inventory(files) {
  const found = new Map();
  const visit = value => {
    if (!value || typeof value !== 'object') return;
    if (!Array.isArray(value)) {
      const fields = Object.fromEntries(Object.entries(value).map(([k,v]) => [k.toLowerCase(),v]));
      for (const [icon, source] of [['icon','iconpath'],['battleaffinityicon','battleaffinityiconpath'],['categoryicon','categoryiconpath']]) {
        let name = fields[icon];
        if (icon === 'icon' && !name && fields.itemid) name = `${fields.itemid}.png`;
        if (typeof name === 'string' && direct(name) && name.toLowerCase().endsWith('.png') && fields[source]) {
          const key = name.toLowerCase();
          if (!found.has(key)) found.set(key, {filename:name,source:String(fields[source]).trim().replaceAll('\\','/')});
        }
      }
    }
    Object.values(value).forEach(visit);
  };
  const byName = new Map(files.map(f => [f.name,f.data]));
  for (const name of [...tables,...[...byName.keys()].sort().filter(n => !tables.includes(n) && !ignored.has(n))]) visit(byName.get(name));
  return [...found.values()].sort((a,b) => a.filename.toLowerCase() < b.filename.toLowerCase() ? -1 : a.filename.toLowerCase() > b.filename.toLowerCase() ? 1 : 0);
}
export async function validateImages(imageDir, files, gameVersion, allowLegacy) {
  const rows = inventory(files);
  const manifestPath = path.join(imageDir,'manifest.json');
  const manifest = await exists(manifestPath) ? JSON.parse(await readFile(manifestPath,'utf8')) : null;
  if (!manifest && !allowLegacy) throw new Error('Images have no provenance manifest; explicitly use --allow-legacy for existing legacy artwork');
  if (manifest) {
    const canonical = JSON.stringify(rows).replace(/[\u007f-\uffff]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4,'0')}`);
    if (manifest.schema_version !== 1 || manifest.algorithm !== 'sha256' || manifest.provenance !== 'gameInventory' || manifest.gameVersion !== gameVersion || manifest.inventorySha256 !== hash(canonical)) throw new Error('Image manifest schema, release, or current icon inventory mismatch');
    if (!manifest.files || !manifest.sourceDdsSha256) throw new Error('Incomplete image provenance manifest');
    for (const row of rows) if (!manifest.files[row.filename] || !/^[a-f0-9]{64}$/i.test(manifest.sourceDdsSha256[row.source] || '')) throw new Error(`Missing image provenance: ${row.filename}`);
  } else console.warn('Legacy images: file integrity checked; game-source provenance is not established.');
  const names = (await readdir(imageDir)).filter(n => n.toLowerCase().endsWith('.png'));
  const hashes = {};
  const available = new Set(names.map(n => n.toLowerCase()));
  for (const row of rows) if (!available.has(row.filename.toLowerCase())) throw new Error(`Missing PNG: ${row.filename}`);
  for (const name of names) {
    const bytes = await readFile(path.join(imageDir,name));
    hashes[name] = hash(bytes);
    if (!bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))) throw new Error(`Not a PNG: ${name}`);
    await sharp(bytes,{failOn:'warning'}).raw().toBuffer();
    const entry = manifest?.files?.[name];
    if (entry && (entry.sha256 !== hash(bytes) || entry.size !== bytes.length)) throw new Error(`Image hash/size mismatch: ${name}`);
  }
  for (const name of Object.keys(manifest?.files || {})) if (!direct(name) || !names.includes(name)) throw new Error(`Missing or unsafe managed image: ${name}`);
  if (manifest) hashes['manifest.json'] = hash(await readFile(manifestPath));
  const required = new Set(rows.map(row => row.filename.toLowerCase()));
  const importNames = names.filter(name => required.has(name.toLowerCase()) || manifest?.files?.[name]);
  return {names:importNames, manifest, hashes, count:rows.length};
}

// Stage complete copies, preserving site-owned art. Retain previous directories
// after a successful swap; reverse every completed rename on failure.
export async function publishImport(siteRoot, sourceRoot, jsonNames, imageNames, move = rename, expectedHashes = {}) {
  siteRoot = await realpath(siteRoot);
  for (const relative of ['src/datav2','public/images/items','.data-import-backups']) {
    const target = path.join(siteRoot,relative);
    if (await exists(target)) {
      const resolved = path.relative(siteRoot,await realpath(target));
      if (resolved.startsWith('..') || path.isAbsolute(resolved)) throw new Error(`Import target escapes site workspace: ${relative}`);
    }
  }
  const lockPath = path.join(siteRoot,'.data-import.lock');
  const lock = await open(lockPath,'wx');
  const id = randomUUID();
  const stage = path.join(siteRoot,`.data-import-stage-${id}`);
  const backup = path.join(siteRoot,'.data-import-backups',id);
  const moved = [], installed = [];
  try {
    if (await exists(path.join(sourceRoot,'.extraction.lock'))) throw new Error('Extractor refresh is running');
    for (const [relative, source, names] of [['src/datav2','data/json',jsonNames],['public/images/items','data/images',imageNames]]) {
      const target = path.join(siteRoot,relative), staged = path.join(stage,relative);
      await mkdir(path.dirname(staged),{recursive:true});
      if (await exists(target)) await cp(target,staged,{recursive:true});
      else await mkdir(staged,{recursive:true});
      if (source === 'data/images' && await exists(path.join(staged,'manifest.json'))) {
        const oldManifest = JSON.parse(await readFile(path.join(staged,'manifest.json'),'utf8'));
        for (const name of Object.keys(oldManifest.files || {})) {
          if (!direct(name)) throw new Error(`Unsafe old managed image: ${name}`);
          if (!imageNames.includes(name) && await exists(path.join(staged,name))) await unlink(path.join(staged,name));
        }
        if (!imageNames.includes('manifest.json')) await unlink(path.join(staged,'manifest.json'));
      }
      for (const name of names) {
        if (!direct(name)) throw new Error(`Unsafe import filename: ${name}`);
        await cp(path.join(sourceRoot,source,name),path.join(staged,name));
        const expected = expectedHashes[source]?.[name];
        if (expected && hash(await readFile(path.join(staged,name))) !== expected) throw new Error(`Source changed during import: ${name}`);
      }
    }
    if (await exists(path.join(sourceRoot,'.extraction.lock'))) throw new Error('Extractor refresh started during import');
    for (const relative of ['src/datav2','public/images/items']) {
      const target = path.join(siteRoot,relative), old = path.join(backup,relative);
      await mkdir(path.dirname(old),{recursive:true});
      if (await exists(target)) { await move(target,old); moved.push([target,old]); }
      await move(path.join(stage,relative),target); installed.push([target,path.join(stage,relative)]);
    }
    process.stdout.write(`Imported data and PNGs. Previous directories retained at ${backup}\n`);
  } catch(error) {
    for (const [target,staged] of installed.reverse()) await rename(target,staged);
    for (const [target,old] of moved.reverse()) await rename(old,target);
    throw error;
  } finally { await lock.close(); await unlink(lockPath); }
}
