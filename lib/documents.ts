// lib/documents.ts
import crypto from 'crypto';

export function makeSecret() {
  return crypto.randomBytes(20).toString('hex'); // ~TOTP secret substitute
}

// RFC 6238-like one-time code (HMAC-SHA1), 6 digits, rotates every 5 min by default
export function rotatingCode(secret: string, stepMs = 5 * 60 * 1000, digits = 6) {
  const counter = Math.floor(Date.now() / stepMs);
  const msg = Buffer.alloc(8);
  let tmp = counter;
  for (let i = 7; i >= 0; i--) {
    msg[i] = tmp & 0xff;
    tmp = tmp >> 8;
  }
  const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'hex')).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const codeInt =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const code = String(codeInt % 10 ** digits).padStart(digits, '0');
  const expiresInMs = stepMs - (Date.now() % stepMs);
  return { code, expiresInMs };
}