import crypto from "crypto";

const KEY = process.env.HOMI_ENCRYPTION_KEY;

function getKey() {
  if (!KEY || KEY.length < 32) {
    throw new Error("Missing/weak HOMI_ENCRYPTION_KEY (must be 32+ chars).");
  }
  // Derive 32 bytes key
  return crypto.createHash("sha256").update(KEY).digest();
}

export function encrypt(plain: string) {
  const iv = crypto.randomBytes(12);
  const key = getKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decrypt(payloadB64: string) {
  const buf = Buffer.from(payloadB64, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const enc = buf.subarray(28);
  const key = getKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(enc), decipher.final()]);
  return plain.toString("utf8");
}