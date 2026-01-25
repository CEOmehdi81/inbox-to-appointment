import React from "react";

async function fetchParsed(pathRel: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/parse?path=${encodeURIComponent(pathRel)}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Parse failed: ${res.status}`);
  return res.json();
}

export default async function InspectPage({
  searchParams,
}: {
  searchParams: { path?: string };
}) {
  const pathRel = searchParams?.path || "";
  let data: any = null;
  let error: string | null = null;

  if (pathRel) {
    try {
      data = await fetchParsed(pathRel);
    } catch (e: any) {
      error = String(e?.message || e);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Listing details</h1>

      <form className="flex gap-2 mb-6" action="/inspect" method="get">
        <input
          name="path"
          defaultValue={pathRel}
          placeholder="raw/2025/11/05/1762...html"
          className="w-full border rounded px-3 py-2"
        />
        <button className="px-4 py-2 rounded bg-black text-white" type="submit">
          Load
        </button>
      </form>

      {!pathRel && <p>Paste a <code>path_html</code> from <code>/api/changes</code> to view details.</p>}
      {error && <p className="text-red-600">{error}</p>}
      {data?.ok && (
        <>
          <div className="mb-4 text-sm text-gray-500">
            <div>Source: <b>{data.fields?.source}</b></div>
            <div>URL: <a className="underline" href={data.fields?.url} target="_blank">{data.fields?.url}</a></div>
            <div>Seen at: {data.fields?.seen_at}</div>
          </div>

          <table className="w-full border rounded overflow-hidden">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-2 w-48">Field</th>
                <th className="text-left p-2">Value</th>
              </tr>
            </thead>
            <tbody>
              {data.table.map((row: any) => (
                <tr key={row.key} className="border-t">
                  <td className="p-2 font-medium">{row.key}</td>
                  <td className="p-2">
                    {Array.isArray(row.value) ? (
                      <div className="flex flex-wrap gap-2">
                        {row.value.slice(0, 12).map((v: any, i: number) =>
                          typeof v === "string" && v.match(/^https?:\/\/.+\.(jpg|jpeg|png|webp)/i) ? (
                            <img key={i} src={v} alt="" className="h-16 rounded border" />
                          ) : (
                            <code key={i} className="text-xs bg-gray-50 px-1 py-0.5 rounded border">{String(v)}</code>
                          )
                        )}
                      </div>
                    ) : (
                      <span>{String(row.value)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data.debug && (
            <p className="mt-3 text-xs text-gray-500">Found {data.debug.jsonld_count} JSON-LD block(s).</p>
          )}
        </>
      )}
    </div>
  );
}