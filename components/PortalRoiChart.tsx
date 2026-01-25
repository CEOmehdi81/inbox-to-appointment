"use client";

import { useMemo, useState } from "react";
import type { PortalRoiRow } from "@/types/portalRoi";

type Props = {
  rows: PortalRoiRow[];
};

export function PortalRoiChart({ rows }: Props) {
  const [portalFilter, setPortalFilter] = useState<string>("all");

  const portals = useMemo(
    () => Array.from(new Set(rows.map((r) => r.portal))),
    [rows]
  );

  const visibleRows = useMemo(
    () =>
      portalFilter === "all"
        ? rows
        : rows.filter((r) => r.portal === portalFilter),
    [rows, portalFilter]
  );

  const maxCpl = useMemo(
    () =>
      visibleRows.length
        ? Math.max(...visibleRows.map((r) => (r.cpl ?? 0)))
        : 0,
    [visibleRows]
  );

  if (!rows.length) return null;

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">CPL by portal</h2>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-gray-400">Filter:</span>
          <select
            value={portalFilter}
            onChange={(e) => setPortalFilter(e.target.value)}
            className="bg-black border border-gray-700 rounded px-2 py-1 text-xs"
          >
            <option value="all">All portals</option>
            {portals.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        {visibleRows.map((row) => {
          const cpl = row.cpl ?? 0;
          const width = maxCpl > 0 ? (cpl / maxCpl) * 100 : 0;

          return (
            <div key={row.portal} className="flex items-center gap-3">
              <div className="w-24 text-xs text-gray-300">{row.portal}</div>
              <div className="flex-1 h-2 bg-gray-800 rounded overflow-hidden">
                <div
                  className="h-2 rounded bg-blue-500"
                  style={{ width: `${width}%` }}
                />
              </div>
              <div className="w-16 text-right text-xs text-gray-200">
                {row.cpl != null ? `${row.cpl.toFixed(0)} €` : "—"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}