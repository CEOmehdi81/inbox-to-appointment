#!/usr/bin/env node
/**
 * Usage: node parse_immowelt_jsonld.js input.html output.jsonl
 * Zero-dependency JSON-LD extractor + normalizer for Immowelt search/detail HTML.
 * Produces NDJSON with fields:
 * { listing_id, title, price, currency, area_sqm, rooms, address, lat, lon, url, images, provider, seen_at }
 */

const fs = require('fs');
const path = require('path');

const [,, inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error('Usage: node parse_immowelt_jsonld.js <input.html> <output.jsonl>');
  process.exit(1);
}

const html = fs.readFileSync(inPath, 'utf8');
const seenAt = new Date().toISOString();
const provider = 'immowelt';

/** Minimal HTML-entity decode for JSON-LD blocks */
function decodeEntities(s) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function safeParseJSON(s) {
  try { return JSON.parse(s); } catch { return null; }
}

function toArray(x) { return Array.isArray(x) ? x : (x ? [x] : []); }

function normAddress(addr) {
  if (!addr || typeof addr !== 'object') return null;
  const parts = [
    addr.streetAddress,
    addr.postalCode,
    addr.addressLocality,
    addr.addressRegion,
    addr.addressCountry
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

function numberish(x) {
  if (x == null) return null;
  if (typeof x === 'number') return x;
  const m = String(x).replace(/\s/g, '').match(/-?\d+(?:[.,]\d+)?/);
  if (!m) return null;
  return parseFloat(m[0].replace(',', '.'));
}

function deriveId(u) {
  if (!u) return null;
  try {
    const url = new URL(u);
    const m = url.pathname.match(/expose\/([^\/?#]+)/i);
    if (m) return m[1];
    // fallback: compact path as an ID-ish string
    return url.hostname.replace(/\W+/g,'') + '-' + url.pathname.replace(/\W+/g,'').slice(-24);
  } catch {
    return null;
  }
}

function pickFirst(...vals) {
  for (const v of vals) {
    if (v != null) return v;
  }
  return null;
}

function normalizeOne(o, contextUrl=null) {
  // Support nested item structures (ItemList/ListItem)
  const base = o.item && typeof o.item === 'object' ? o.item : o;
  const url  = pickFirst(base.url, base['@id'], contextUrl);
  const offers = toArray(base.offers);
  const offer  = offers[0] || base;
  const price  = pickFirst(offer.price, offer.priceAmount, offer.priceSpecification && offer.priceSpecification.price);
  const currency = pickFirst(
    offer.priceCurrency,
    offer.priceSpecification && offer.priceSpecification.priceCurrency
  );

  const floorSize = base.floorSize && (base.floorSize.value || base.floorSize);
  const area = numberish(pickFirst(
    (floorSize && floorSize.value) || floorSize,
    base.area,
    base.size,
    base.livingArea
  ));

  const rooms = numberish(pickFirst(
    base.numberOfRooms && (base.numberOfRooms.value || base.numberOfRooms),
    base.rooms
  ));

  // Address / geo
  const address = base.address || (base.location && base.location.address);
  const geo     = base.geo || (base.location && base.location.geo);

  const out = {
    listing_id: pickFirst(base.sku, base.identifier, deriveId(url)),
    title: pickFirst(base.name, base.title, o.name, o.title),
    price: price != null ? numberish(price) : null,
    currency: currency || null,
    area_sqm: area,
    rooms,
    address: normAddress(address) || null,
    lat: geo && numberish(geo.latitude),
    lon: geo && numberish(geo.longitude),
    url: url || null,
    images: toArray(base.image).map(String).filter(Boolean),
    provider,
    seen_at: seenAt,
  };

  // Only return plausible listing-like objects
  const hasSomeSignal =
    out.url || out.price != null || out.area_sqm != null || out.rooms != null || out.images.length > 0;
  if (!hasSomeSignal) return null;

  return out;
}

// 1) Extract JSON-LD blocks
const scriptMatches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
let blocks = [];
for (const m of scriptMatches) {
  const jsonText = decodeEntities(m[1].trim());
  const parsed = safeParseJSON(jsonText);
  if (parsed == null) continue;
  if (Array.isArray(parsed)) {
    blocks.push(...parsed);
  } else {
    blocks.push(parsed);
  }
}

// 2) Flatten ItemList -> ListItem -> item
function* flattenObjects(objs) {
  for (const o of objs) {
    if (!o || typeof o !== 'object') continue;
    const type = o['@type'];
    if (type === 'ItemList' && Array.isArray(o.itemListElement)) {
      for (const li of o.itemListElement) {
        if (li && typeof li === 'object') yield li;
      }
    } else {
      yield o;
    }
  }
}
const flattened = [...flattenObjects(blocks)];

// 3) Normalize candidates
const candidates = [];
for (const o of flattened) {
  const n = normalizeOne(o);
  if (n) candidates.push(n);
}

// 4) De-duplicate (prefer entries with url and more fields)
const byKey = new Map();
function keyFor(r) { return (r.provider || 'immowelt') + '|' + (r.listing_id || r.url || 'unknown'); }
function richnessScore(r) {
  let s = 0;
  if (r.url) s += 2;
  if (r.price != null) s += 2;
  if (r.area_sqm != null) s += 1;
  if (r.rooms != null) s += 1;
  if (r.lat && r.lon) s += 1;
  if (r.images && r.images.length) s += 1;
  return s;
}
for (const r of candidates) {
  const k = keyFor(r);
  const existing = byKey.get(k);
  if (!existing || richnessScore(r) > richnessScore(existing)) {
    byKey.set(k, r);
  }
}

const uniques = [...byKey.values()].filter(x => x.url || x.listing_id);

// 5) Write NDJSON
const outStream = fs.createWriteStream(outPath, { encoding: 'utf8' });
for (const rec of uniques) {
  outStream.write(JSON.stringify(rec) + '\n');
}
outStream.end();

console.log(JSON.stringify({
  stats: {
    jsonld_blocks_found: blocks.length,
    flattened_objects: flattened.length,
    candidate_records: candidates.length,
    unique_records_written: uniques.length
  },
  output: path.resolve(outPath)
}, null, 2));
