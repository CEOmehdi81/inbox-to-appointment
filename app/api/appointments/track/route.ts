// app/api/track.js/route.ts
import { NextResponse, NextRequest } from 'next/server';

export const runtime = 'nodejs';

/**
 * GET /api/track.js?listing=LISTING_ID
 * Returns a tiny JS that:
 *  - sends a 'view' on load
 *  - listens for clicks on elements with [data-homi] and sends that event
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const listing = url.searchParams.get('listing') || '';

  const js = `
  (function(){
    try{
      var s = document.currentScript;
      var u = new URL(s && s.src || window.location.href);
      var LISTING = u.searchParams.get('listing') || ${JSON.stringify(listing)};
      if(!LISTING) return;

      function send(type, extra){
        fetch('/api/track', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify(Object.assign({ listingId: LISTING, type: type }, extra||{}))
        }).catch(function(){});
      }

      // view on load
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function(){ send('view'); }, { once: true });
      } else {
        send('view');
      }

      // any click bubbling up from an element with [data-homi]
      document.addEventListener('click', function(e){
        var el = e.target && (e.target.closest ? e.target.closest('[data-homi]') : null);
        if(!el) return;
        var t = el.getAttribute('data-homi');
        if(!t) return;
        send(t);
      });
    }catch(e){}
  })();
  `.trim();

  return new NextResponse(js, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}