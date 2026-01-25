import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

function baseDir() {
  return process.env.HOMI_DATA_DIR || path.join(os.homedir(), "homi-data");
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") || "50")));

    const idx = path.join(baseDir(), "raw", "index.jsonl");
    if (!fs.existsSync(idx)) {
      return NextResponse.json({ items: [], nextOffset: 0 });
    }

    // Read last `limit` lines from the end (simple but fine for now)
    const text = fs.readFileSync(idx, "utf8");
    const lines = text.trim().split("\n").filter(Boolean);
    const last = lines.slice(-limit);

    const items = last.map((line) => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);

    // nextOffset = file size in bytes (for future streaming if needed)
    const stat = fs.statSync(idx);
    return NextResponse.json({ items, nextOffset: stat.size });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}