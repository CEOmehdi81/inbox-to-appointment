/* content.js — runs when you click the HOMI icon / hotkey
   Pipeline:
   1) Detect page type (detail vs grid).
   2) Extract data using JSON-LD (preferred), microdata fallback, and robust heuristics.
   3) Normalize: price/area/city/rent_or_sale/images/etc.
   4) POST to n8n endpoint from chrome.storage.local (with sane defaults).
   5) Show a tiny progress/toast bar.
*/

(async () => {
  // Don’t run inside iframes
  if (window.top !== window.self) return;

  // ---- Config --------------------------------------------------------------
  let ENDPOINT = "http://127.0.0.1:5681/webhook/agents/discover";
  let LIMIT = 30;

  try {
    const cfg = await chrome.storage?.local?.get?.(["endpoint", "limit"]);
    if (cfg?.endpoint) ENDPOINT = cfg.endpoint;
    if (cfg?.limit) LIMIT = Number(cfg.limit) || LIMIT;
  } catch {
    // running outside extension context (shouldn’t happen when triggered via icon)
  }

  // ---- Tiny UI -------------------------------------------------------------
  const ui = (() => {
    let wrap, bar, label, fill;
    const ensure = () => {
      if (wrap) return;
      wrap = document.createElement("div");
      wrap.style.cssText = `
        position:fixed;left:16px;bottom:16px;z-index:2147483647;
        background:#0b1220cc;border:1px solid #0006;color:#fff;
        padding:10px 12px;border-radius:12px;font:12px/1.35 system-ui;
        backdrop-filter:saturate(120%) blur(4px);
        box-shadow:0 6px 20px #0006;
      `;
      label = document.createElement("div");
      label.textContent = "HOMI Capture";
      label.style.margin = "0 0 8px";
      bar = document.createElement("div");
      bar.style.cssText = `height:6px;width:240px;background:#1e293b;border-radius:999px;overflow:hidden;`;
      fill = document.createElement("div");
      fill.style.cssText = `height:100%;width:0;background:linear-gradient(90deg,#22c55e,#84cc16);transition:width .15s ease;`;
      bar.appendChild(fill);
      wrap.appendChild(label);
      wrap.appendChild(bar);
      document.body.appendChild(wrap);
    };
    const update = (done, total) => {
      ensure();
      const pct = total ? Math.round((done / total) * 100) : 0;
      label.textContent = `HOMI Capture — ${done}/${total}`;
      fill.style.width = `${pct}%`;
    };
    const done = (n) => {
      ensure();
      label.textContent = `Sent ${n} item(s) ✓`;
      fill.style.width = "100%";
      setTimeout(() => wrap?.remove(), 2500);
    };
    return { update, done };
  })();

  // ---- Utils ---------------------------------------------------------------
  const bySel  = (sel, root = document) => root.querySelector(sel);
  const byAll  = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const text   = (el) => (el ? el.textContent.trim() : "");
  const first  = (...arr) => arr.find((x) => !!x);
  const domain = location.hostname.replace(/^www\./, "");
  const nowIso = () => new Date().toISOString();

  const onlyDigits = (s) => (s || "").replace(/[^\d.,]/g, "").replace(",", ".");
  const toFloat    = (s) => {
    const v = parseFloat(onlyDigits(s));
    return Number.isFinite(v) ? v : null;
  };

  const parsePrice = (s) => {
    if (!s) return null;
    const amount   = toFloat(s);
    if (amount == null) return null;
    const low      = s.toLowerCase();
    const rentLike = /mois|mensuel|cc|hc|charges|rent|let|per\s*month/i.test(low);
    const currency = /€|eur/i.test(s) ? "EUR" : (/\£|gbp/i.test(s) ? "GBP" : (/\$|usd/i.test(s) ? "USD" : undefined));
    return { amount, currency, rent: !!rentLike };
  };

  const parseArea = (s) => {
    if (!s) return null;
    const m = /([\d.,]+)\s?(?:m²|m2)/i.exec(s);
    return m ? toFloat(m[1]) : null;
  };

  const guessRentOrSale = (...chunks) => {
    const s = chunks.flat().filter(Boolean).join(" ").toLowerCase();
    if (/rent|let|loyer|location|à louer|to let|per month|pcm/.test(s)) return "rent";
    if (/sale|buy|vente|à vendre|for sale/.test(s)) return "sale";
    return null;
  };

  // ---- JSON-LD / Microdata -------------------------------------------------
  function flatten(obj, acc) {
    if (!obj || typeof obj !== "object") return;
    acc.push(obj);
    for (const k of Object.keys(obj)) {
      try { flatten(obj[k], acc); } catch {}
    }
  }

  const extractJsonLdBlocks = () => {
    const blocks = byAll('script[type="application/ld+json"]');
    const out = [];
    for (const b of blocks) {
      try {
        const raw = b.textContent.trim();
        if (!raw) continue;
        const data = JSON.parse(raw);
        const arr  = Array.isArray(data) ? data : [data];
        for (const node of arr) flatten(node, out);
      } catch { /* ignore invalid JSON-LD */ }
    }
    return out;
  };

  function ldAddressToObj(a) {
    if (!a || typeof a !== "object") return null;
    return {
      street:      a.streetAddress || a.street || undefined,
      city:        a.addressLocality || a.city || undefined,
      region:      a.addressRegion || undefined,
      postal_code: a.postalCode || undefined,
      country:     a.addressCountry || undefined,
      freeform: [a.streetAddress, a.postalCode, a.addressLocality, a.addressRegion, a.addressCountry]
        .filter(Boolean).join(", ") || undefined,
    };
  }

  function extractFromJsonLd() {
    const nodes = extractJsonLdBlocks();
    if (!nodes.length) return null;

    // Prefer RealEstateListing / Offer / Product with price/address
    const score = (n) => {
      const t = JSON.stringify(n["@type"] || "").toLowerCase();
      let s = 0;
      if (/realestatelisting|apartment|singlefamily|house|product|offer|place/.test(t)) s += 3;
      if (n.address) s += 2;
      if (n.offers || n.price || n.priceSpecification) s += 2;
      if (n.image) s += 1;
      return s;
    };

    const best = nodes
      .filter(Boolean)
      .map((n) => [score(n), n])
      .sort((a,b) => b[0] - a[0])[0]?.[1];

    if (!best) return null;

    // Pull fields from the best node (and common nested shapes)
    const title = best.name || best.title || bySel("h1")?.textContent?.trim() || document.title;
    const images = (() => {
      const arr = [];
      if (Array.isArray(best.image)) arr.push(...best.image);
      else if (typeof best.image === "string") arr.push(best.image);
      // also pick OG image
      const og = bySel('meta[property="og:image"]')?.content;
      if (og) arr.push(og);
      return Array.from(new Set(arr.filter((u) => /^https?:/i.test(u)))).slice(0, 12);
    })();

    // Price / offers
    const offer = Array.isArray(best.offers) ? best.offers[0] : best.offers;
    const priceFromLd =
      offer?.price || best.price ||
      offer?.priceSpecification?.price || best.priceSpecification?.price;

    const priceCurrency =
      offer?.priceCurrency || best.priceCurrency ||
      offer?.priceSpecification?.priceCurrency || best.priceSpecification?.priceCurrency;

    const price = priceFromLd ? { amount: toFloat(String(priceFromLd)), currency: priceCurrency } : null;

    // Area
    let area = null;
    const areaNode = best.floorSize || best.area || best.size;
    if (typeof areaNode === "string") {
      area = parseArea(areaNode);
    } else if (typeof areaNode === "object") {
      area = toFloat(String(areaNode.value || areaNode.amount || ""));
    }

    // Address
    const addr = ldAddressToObj(best.address || offer?.businessFunction?.place?.address);

    // Rent vs sale
    const ros = guessRentOrSale(
      best.name, best.description, JSON.stringify(best["@type"] || ""),
      JSON.stringify(offer?.category || ""), JSON.stringify(offer?.availability || "")
    );

    return {
      page_type: "detail",
      source: domain,
      url: location.href,
      title: (title || "").trim(),
      price_amount: price?.amount ?? null,
      price_currency: price?.currency ?? "EUR",
      rent_or_sale: ros || "unknown",
      area_m2: area ?? null,
      address: addr,
      images,
      seen_at: nowIso(),
    };
  }

  function extractMicrodataPostal() {
    const addr = bySel('[itemtype*="PostalAddress"], [itemscope][itemtype*="PostalAddress"]');
    if (!addr) return null;
    const get = (p) => addr.querySelector(`[itemprop="${p}"]`)?.textContent?.trim();
    return {
      street: get("streetAddress"),
      city: get("addressLocality"),
      region: get("addressRegion"),
      postal_code: get("postalCode"),
      country: get("addressCountry"),
      freeform: [get("streetAddress"), get("postalCode"), get("addressLocality"), get("addressRegion"), get("addressCountry")]
        .filter(Boolean).join(", ") || undefined,
    };
  }

  // ---- Heuristic (Detail) ---------------------------------------------------
  function normalizeAddress(input) {
    if (!input) return null;
    if (typeof input === "string") return { freeform: input };
    return {
      street: input.streetAddress || input.street || undefined,
      city: input.addressLocality || input.city || undefined,
      region: input.addressRegion || undefined,
      postal_code: input.postalCode || undefined,
      country: input.addressCountry || input.country || undefined,
      freeform: [
        input.streetAddress, input.postalCode, input.addressLocality, input.addressRegion, input.addressCountry,
      ].filter(Boolean).join(", ") || undefined,
    };
  }

  function extractDetailHeuristic() {
    // If JSON-LD already yields a good object, use it
    const fromLd = extractFromJsonLd();
    if (fromLd) return fromLd;

    // Fallback: OG/meta + page content
    const meta = (n) => bySel(`meta[name="${n}"]`)?.content || bySel(`meta[property="${n}"]`)?.content;

    const title = first(
      meta("og:title"),
      text(bySel("h1")),
      document.title
    );

    const priceText = first(
      meta("product:price:amount"),
      byAll("span,div").map(e => /€|eur|gbp|\$|usd/i.test(e.textContent) ? e.textContent.trim() : null).find(Boolean)
    );

    const addressText = first(
      text(bySel('[data-testid*="address"], [class*="address"]')),
      text(bySel('[itemprop="address"]')),
      text(bySel("address")),
      meta("og:street-address")
    );

    const areaText = byAll("span,div,li")
      .map(e => /m²|m2/i.test(e.textContent) ? e.textContent.trim() : null)
      .find(Boolean);

    const images = Array.from(new Set([
      meta("og:image"),
      ...byAll("img").map(i => i.src).filter(s => /^https?:/i.test(s)),
    ].filter(Boolean))).slice(0, 12);

    const price = parsePrice(priceText || "");
    const area_m2 = parseArea(areaText || "");
    const rent_or_sale = price?.rent ? "rent" : (guessRentOrSale(title, addressText) || "unknown");

    // Try microdata postal if present
    const microAddr = extractMicrodataPostal();

    return {
      page_type: "detail",
      source: domain,
      url: location.href,
      title: (title || "").trim(),
      price_amount: price?.amount ?? null,
      price_currency: price?.currency ?? "EUR",
      rent_or_sale,
      area_m2,
      address: normalizeAddress(microAddr || addressText),
      images,
      seen_at: nowIso(),
    };
  }

  // ---- Heuristic (Grid) with strong filtering -------------------------------
  function extractGridHeuristic(limit = LIMIT) {
    // Collect many anchors then filter to likely property URLs
    const urls = Array.from(new Set(
      byAll("a[href]").map(a => a.href).filter(Boolean)
    ))
    .filter(isPropertyUrl)
    .slice(0, limit);

    const items = urls.map((u) => {
      const a = bySel(`a[href="${cssEscape(u)}"]`);
      const card = a?.closest("article,li,div,section") || a;
      const cardText = card ? card.textContent : "";
      const price = parsePrice(cardText);
      const area_m2 = parseArea(cardText);

      const title = first(
        text(card?.querySelector("h2,h3")),
        cardText.split("\n").map(s => s.trim()).find(s => s.length > 25)
      );

      const addrTxt = text(card?.querySelector('[data-testid*="address"], [class*="address"]'));

      return {
        page_type: "grid",
        source: domain,
        url: u,
        title: (title || "").trim(),
        price_amount: price?.amount ?? null,
        price_currency: price?.currency ?? "EUR",
        rent_or_sale: price?.rent ? "rent" : (guessRentOrSale(cardText) || "unknown"),
        area_m2,
        address: normalizeAddress(addrTxt),
        images: [],
        seen_at: nowIso(),
      };
    });

    return items;

    function cssEscape(s) { return s.replace(/["\\]/g, "\\$&"); }

    // Portal-aware filter: pass only “real listing” detail URLs
    function isPropertyUrl(u) {
      try {
        const url  = new URL(u);
        const host = url.hostname.replace(/^www\./, "");
        const path = url.pathname.toLowerCase();

        // SeLoger: keep only /annonces/(locations|vente)/… .htm (detail pages)
        if (/seloger\.com$/i.test(host)) {
          if (!/\/annonces\/(locations|vente)\//i.test(path)) return false;
          if (!/\.htm($|[?#])/i.test(path)) return false;
          if (/\/edito\/|\/depot-annonce\/|\/annuaire\/|\/prix-de-l-immo\/|\/credit-|\/proprietaire\//i.test(path)) return false;
          return true;
        }

        // Generic rule for other portals
        const keep = /(to-rent|for-sale|buy|rent|vente|location|property|realestate|listing|classified)/i.test(path);
        const drop = /(blog|help|advice|guide|edito|news|terms|privacy|login|signup|map|contact|about|depot|annuaire|credit|mortgage|prix-de-l-immo)/i.test(path);
        return keep && !drop;
      } catch { return false; }
    }
  }

  // ---- Page classifier ------------------------------------------------------
  function isDetailLikely() {
    // JSON-LD types are a strong indicator
    const types = extractJsonLdBlocks().map(n => String(n?.["@type"] || "").toLowerCase()).join(" ");
    if (/realestatelisting|apartment|singlefamily|house|product|offer/.test(types)) return true;

    // URL hints
    if (/annonce|classified|listing/i.test(location.pathname)) return true;
    if (/\.htm($|[?#])/i.test(location.pathname)) return true;

    // Big H1 + many images
    if (bySel("h1") && byAll("img").length >= 5) return true;

    return false;
  }

  // ---- Run -----------------------------------------------------------------
  let payload = [];
  if (isDetailLikely()) {
    payload = [extractDetailHeuristic()];
  } else {
    payload = extractGridHeuristic(LIMIT);
  }

  // Filter out empties / nulls defensively
  payload = payload.filter(Boolean);

  ui.update(0, payload.length);

  // POST to n8n
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: payload }),
    });
    ui.update(payload.length, payload.length);
    ui.done(payload.length);
    console.log("[HOMI] POST", res.status, "→", ENDPOINT);
  } catch (e) {
    console.warn("[HOMI] POST failed:", e);
    ui.done(0);
  }
})();