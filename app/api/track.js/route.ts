// app/api/track.js/route.ts
import type { NextRequest } from 'next/server';

export const runtime = 'edge'; // tiny, cacheable

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const listing = (url.searchParams.get('listing') || '').trim();
  const channelId = (url.searchParams.get('channel') || '').trim(); // optional

  // Inline the IDs so the script works cross-origin without needing to read its own URL
  const js = `
(function(){
  var LISTING="${listing}";
  var CHANNEL="${channelId}";
  if(!LISTING){console.warn("[HOMI] Missing ?listing= in /api/track.js src"); return;}

  // session cookie (1 year)
  try{
    var sid = (document.cookie.match(/(?:^|; )homi_sid=([^;]+)/)||[])[1];
    if(!sid){
      sid = (crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36)+Math.random().toString(36).slice(2));
      document.cookie = "homi_sid="+sid+"; Max-Age="+(60*60*24*365)+"; Path=/; SameSite=Lax";
    }
  }catch(e){}

  function send(type, extras){
    try{
      var payload = {
        listingId: LISTING,
        channelId: CHANNEL || undefined,
        type: type,
        // enrich from page
        href: location.href,
        title: document.title.slice(0,300),
        utmSource: new URLSearchParams(location.search).get('utm_source') || undefined,
        utmMedium: new URLSearchParams(location.search).get('utm_medium') || undefined,
        utmCampaign: new URLSearchParams(location.search).get('utm_campaign') || undefined,
      };
      if (extras) for (var k in extras){ payload[k]=extras[k]; }
      var blob = new Blob([JSON.stringify(payload)], {type:"application/json"});
      // Prefer beacon (fires even on unload)
      if (navigator.sendBeacon) { navigator.sendBeacon("/api/track", blob); }
      else { fetch("/api/track",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),keepalive:true}); }
    }catch(e){}
  }

  // Auto "view"
  if (document.readyState === "complete" || document.readyState === "interactive") send("view");
  else window.addEventListener("DOMContentLoaded", function(){ send("view"); });

  // Delegate clicks: mark any element with data-homi-event="lead_click|contact_click|favorite|download"
  document.addEventListener("click", function(ev){
    var el = ev.target as HTMLElement | null;
    while (el && !el.getAttribute) el = (el as any).parentNode;
    if (!el) return;
    var evName = el.getAttribute && el.getAttribute("data-homi-event");
    if (!evName) return;
    var extras:any = {};
    var href = (el as HTMLAnchorElement).href || "";
    if (href) extras.targetHref = href;
    var label = el.getAttribute("data-homi-label") || el.textContent || "";
    if (label) extras.label = label.slice(0,300);
    send(evName, extras);
  }, true);
})();`;

  return new Response(js, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=600', // 10 min
    },
  });
}