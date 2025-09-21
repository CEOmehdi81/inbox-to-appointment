(() => {
    try {
      // Read config from data-attrs
      const s = document.currentScript;
      const listingId = s?.dataset?.listing || '';
      const channelId = s?.dataset?.channel || '';
      const type = s?.dataset?.type || 'view';
  
      if (!listingId) return;
  
      // Create a soft session id cookie (7d)
      const SID = 'homi_sid';
      function getSid() {
        const m = document.cookie.match(new RegExp('(?:^|; )' + SID + '=([^;]*)'));
        return m ? decodeURIComponent(m[1]) : '';
      }
      function setSid(val) {
        const e = new Date(Date.now() + 7 * 24 * 3600 * 1000).toUTCString();
        document.cookie = `${SID}=${encodeURIComponent(val)}; path=/; expires=${e}; SameSite=Lax`;
      }
      let sid = getSid();
      if (!sid) {
        sid = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
        setSid(sid);
      }
  
      const utm = new URLSearchParams(window.location.search);
      const payload = {
        listingId,
        channelId: channelId || undefined,
        type,
        utmSource: utm.get('utm_source') || undefined,
        utmMedium: utm.get('utm_medium') || undefined,
        utmCampaign: utm.get('utm_campaign') || undefined,
        sessionId: sid,
      };
  
      // Fire-and-forget; don’t block page
      fetch('/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch {}
  })();