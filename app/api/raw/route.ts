// app/api/raw/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

function baseDir() {
  return process.env.HOMI_DATA_DIR || path.join(os.homedir(), 'homi-data');
}

function guessContentType(p: string): string {
  const lower = p.toLowerCase();
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'text/html; charset=utf-8';
  if (lower.endsWith('.json')) return 'application/json; charset=utf-8';
  if (lower.endsWith('.txt') || lower.endsWith('.log')) return 'text/plain; charset=utf-8';
  return 'application/octet-stream';
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    let rel = (url.searchParams.get('path') || '').trim(); // e.g. raw/2025/11/05/xxxx.html
    if (!rel) return NextResponse.json({ error: 'Missing ?path' }, { status: 400 });

    // prevent absolute / traversal
    rel = rel.replace(/^\/+/, '');
    const root = path.resolve(baseDir());
    const abs = path.resolve(path.join(root, rel));

    if (!abs.startsWith(root + path.sep) && abs !== root) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!fs.existsSync(abs)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const buf = fs.readFileSync(abs); // Buffer
    const ct = guessContentType(abs);

    // Buffer is a Uint8Array; cast to BodyInit to satisfy TS
    return new NextResponse(buf as unknown as BodyInit, {
      status: 200,
      headers: { 'Content-Type': ct },
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}