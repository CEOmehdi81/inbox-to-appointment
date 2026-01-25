const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const { google } = require("googleapis");

function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`missing env ${name}`);
  return v;
}

// inline decrypt() (same logic as lib/crypto.ts)
const KEY = process.env.HOMI_ENCRYPTION_KEY;
function getKey() {
  if (!KEY || KEY.length < 32) throw new Error("Missing/weak HOMI_ENCRYPTION_KEY (32+ chars).");
  return crypto.createHash("sha256").update(KEY).digest();
}
function decrypt(payloadB64) {
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

(async () => {
  const prisma = new PrismaClient();

  const GOOGLE_OAUTH_CLIENT_ID = mustEnv("GOOGLE_OAUTH_CLIENT_ID");
  const GOOGLE_OAUTH_CLIENT_SECRET = mustEnv("GOOGLE_OAUTH_CLIENT_SECRET");
  const GOOGLE_OAUTH_REDIRECT_URL = mustEnv("GOOGLE_OAUTH_REDIRECT_URL");

  const integ = await prisma.emailIntegration.findFirst({
    where: { provider: "GMAIL" },
    orderBy: { updatedAt: "desc" },
  });

  if (!integ) throw new Error("No EmailIntegration row with provider=GMAIL found");

  console.log("Integration:", {
    id: integ.id,
    agencyId: integ.agencyId,
    email: integ.email,
    status: integ.status,
    scope: integ.scope,
    updatedAt: integ.updatedAt,
    hasRefreshTokenEnc: !!integ.refreshTokenEnc,
    hasAccessTokenEnc: !!integ.accessTokenEnc,
    expiryDateMs: integ.expiryDateMs,
  });

  if (!integ.refreshTokenEnc) throw new Error("refreshTokenEnc is null");

  const refreshToken = decrypt(integ.refreshTokenEnc);

  const oauth2 = new google.auth.OAuth2(
    GOOGLE_OAUTH_CLIENT_ID,
    GOOGLE_OAUTH_CLIENT_SECRET,
    GOOGLE_OAUTH_REDIRECT_URL
  );

  const creds = { refresh_token: refreshToken };

  if (integ.accessTokenEnc) {
    try { creds.access_token = decrypt(integ.accessTokenEnc); } catch {}
  }
  if (integ.expiryDateMs) creds.expiry_date = Number(integ.expiryDateMs);

  oauth2.setCredentials(creds);

  const gmail = google.gmail({ version: "v1", auth: oauth2 });

  const prof = await gmail.users.getProfile({ userId: "me" });
  console.log("Gmail profile:", prof.data);

  const list = await gmail.users.messages.list({
    userId: "me",
    q: "newer_than:30d",
    maxResults: 5,
  });

  const msgs = list.data.messages || [];
  console.log("Messages found:", msgs.length);
  console.log("IDs:", msgs.map(m => m.id));

  if (msgs[0]?.id) {
    const id = msgs[0].id;
    const msg = await gmail.users.messages.get({
      userId: "me",
      id,
      format: "metadata",
      metadataHeaders: ["From", "To", "Subject"],
    });

    console.log("Sample message:", {
      id,
      snippet: msg.data.snippet,
      headers: msg.data.payload?.headers,
    });
  }

  await prisma.$disconnect();
})().catch((e) => {
  console.error("DEBUG FAILED:", e?.message || e);
  process.exit(1);
});
