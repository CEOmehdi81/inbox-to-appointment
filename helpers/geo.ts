// helpers/geo.ts
export async function geocodeAddress(input: {
    address?: string | null;
    city?: string | null;
    country?: string | null;
  }) {
    const parts = [input.address, input.city, input.country]
      .filter(Boolean)
      .map(s => String(s).trim());
    if (parts.length === 0) return null;
  
    // You can swap this with your own Nominatim mirror or a paid provider later
    const q = encodeURIComponent(parts.join(', '));
    const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`;
  
    try {
      const res = await fetch(url, {
        headers: {
          // helps with fair-use on nominatim
          'User-Agent': 'HOMI/1.0 (contact: support@example.com)',
        },
        // keep it snappy; we’ll try again later on failure
        cache: 'no-store',
        next: { revalidate: 0 },
      } as any);
  
      const data = (await res.json()) as any[];
      if (!Array.isArray(data) || data.length === 0) return null;
      const top = data[0];
      const lat = Number(top.lat);
      const lon = Number(top.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      return { lat, lon };
    } catch {
      return null;
    }
  }