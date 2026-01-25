import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/crypto";

function must(v: string | undefined, name: string) {
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export async function getValidGmailAccessToken(agencyId: string) {
  const row = await prisma.emailIntegration.findUnique({ where: { agencyId } });
  if (!row) throw new Error("No email integration for this agency");
  if (row.status === "RESTRICTED") throw new Error("Integration restricted");
  if (!row.refreshTokenEnc) throw new Error("Missing refresh token, reconnect required");

  const clientId = must(process.env.GOOGLE_OAUTH_CLIENT_ID, "GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = must(process.env.GOOGLE_OAUTH_CLIENT_SECRET, "GOOGLE_OAUTH_CLIENT_SECRET");

  const now = BigInt(Date.now());
  const expiresAt = row.expiryDateMs ?? BigInt(0);

  // If token exists and not expiring in next 60s, reuse it
  if (row.accessTokenEnc && expiresAt > now + BigInt(60_000)) {
    return decrypt(row.accessTokenEnc);
  }

  const refreshToken = decrypt(row.refreshTokenEnc);

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenRes.ok) {
    const txt = await tokenRes.text();
    await prisma.emailIntegration.update({
      where: { agencyId },
      data: { status: "ERROR", lastError: txt || "refresh_failed" },
    });
    throw new Error(txt || "Failed to refresh token");
  }

  const json: any = await tokenRes.json();
  const accessToken = json.access_token as string;

  await prisma.emailIntegration.update({
    where: { agencyId },
    data: {
      accessTokenEnc: encrypt(accessToken),
      tokenType: json.token_type ?? row.tokenType,
      scope: json.scope ?? row.scope,
      expiryDateMs: json.expires_in ? BigInt(Date.now() + json.expires_in * 1000) : row.expiryDateMs,
      lastError: null,
      status: row.status === "PENDING" ? "CONNECTED" : row.status,
    },
  });

  return accessToken;
}