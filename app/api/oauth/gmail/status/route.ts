// app/api/oauth/gmail/status/route.ts
// Diagnostic route to check Gmail integration health
// Matches your existing project structure

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeDecrypt(enc?: string | null): string | null {
  if (!enc) return null;
  try {
    return decrypt(enc);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const agencyId = url.searchParams.get("agencyId");

    if (!agencyId) {
      return NextResponse.json({ ok: false, error: "agencyId is required" }, { status: 400 });
    }

    // Find all Gmail integrations for this agency
    const integrations = await prisma.emailIntegration.findMany({
      where: {
        agencyId,
        provider: "GMAIL",
      },
    });

    if (!integrations.length) {
      return NextResponse.json({
        ok: true,
        status: "not_connected",
        message: "No Gmail integrations found for this agency",
        action: "Connect Gmail via /api/oauth/gmail/start?agencyId=" + agencyId,
      });
    }

    const results = [];

    for (const integ of integrations) {
      const accessToken = safeDecrypt(integ.accessTokenEnc);
      const refreshToken = safeDecrypt(integ.refreshTokenEnc);

      // Check token status
      let accessTokenStatus = "unknown";
      let refreshTokenStatus = refreshToken ? "present" : "MISSING";

      // Check if access token is expired
      const expiryMs = integ.expiryDateMs ? Number(integ.expiryDateMs) : null;
      const isExpired = expiryMs ? Date.now() > expiryMs : true;

      if (!accessToken) {
        accessTokenStatus = "decryption_failed";
      } else if (isExpired) {
        accessTokenStatus = "expired";
      } else {
        // Verify with Google
        try {
          const verifyRes = await fetch(
            `https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`
          );
          if (verifyRes.ok) {
            accessTokenStatus = "valid";
          } else {
            accessTokenStatus = "invalid";
          }
        } catch {
          accessTokenStatus = "verification_failed";
        }
      }

      // Test refresh token by attempting a refresh
      let refreshTestResult = "not_tested";
      if (refreshToken && (isExpired || accessTokenStatus !== "valid")) {
        try {
          const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
          const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

          if (clientId && clientSecret) {
            const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: refreshToken,
                grant_type: "refresh_token",
              }),
            });

            const refreshData = await refreshRes.json();

            if (refreshRes.ok) {
              refreshTestResult = "refresh_successful";
              
              // Update the access token in DB
              const { encrypt } = await import("@/lib/crypto");
              const newExpiryMs = BigInt(Date.now() + (refreshData.expires_in || 3600) * 1000);
              
              await prisma.emailIntegration.update({
                where: { id: integ.id },
                data: {
                  accessTokenEnc: encrypt(refreshData.access_token),
                  expiryDateMs: newExpiryMs,
                  lastError: null,
                  updatedAt: new Date(),
                },
              });

              accessTokenStatus = "refreshed";
            } else {
              refreshTestResult = `refresh_failed: ${refreshData.error || "unknown"}`;
              
              if (refreshData.error === "invalid_grant") {
                refreshTokenStatus = "EXPIRED_OR_REVOKED";
                
                // Update DB to mark as error
                await prisma.emailIntegration.update({
                  where: { id: integ.id },
                  data: {
                    status: "ERROR",
                    lastError: "Refresh token expired or revoked (invalid_grant). Please reconnect Gmail.",
                    updatedAt: new Date(),
                  },
                });
              }
            }
          }
        } catch (e: any) {
          refreshTestResult = `error: ${e?.message || "unknown"}`;
        }
      }

      results.push({
        id: integ.id,
        email: integ.email,
        status: integ.status,
        accessTokenStatus,
        refreshTokenStatus,
        refreshTestResult,
        expiryDateMs: expiryMs,
        expiresAt: expiryMs ? new Date(expiryMs).toISOString() : null,
        isExpired,
        lastError: integ.lastError,
        createdAt: integ.createdAt,
        updatedAt: integ.updatedAt,
      });
    }

    // Summary
    const hasValidRefreshToken = results.some(
      (r) => r.refreshTokenStatus === "present" && !r.refreshTestResult.includes("invalid_grant")
    );

    const recommendations: string[] = [];

    for (const r of results) {
      if (r.refreshTokenStatus === "MISSING") {
        recommendations.push(`[${r.email}] No refresh token stored. Reconnect Gmail.`);
      } else if (r.refreshTokenStatus === "EXPIRED_OR_REVOKED") {
        recommendations.push(`[${r.email}] Refresh token is dead (invalid_grant). DELETE this integration and reconnect.`);
      } else if (r.refreshTestResult === "refresh_successful" || r.accessTokenStatus === "refreshed") {
        recommendations.push(`[${r.email}] Token was refreshed successfully. Try polling again.`);
      }
    }

    if (!hasValidRefreshToken) {
      recommendations.push("CRITICAL: No working refresh tokens. You must reconnect Gmail.");
      recommendations.push("Steps: 1) Delete integration via /api/oauth/gmail/reset?agencyId=" + agencyId);
      recommendations.push("       2) Reconnect via /api/oauth/gmail/start?agencyId=" + agencyId);
    }

    return NextResponse.json({
      ok: true,
      agencyId,
      integrations: results,
      summary: {
        total: results.length,
        hasValidRefreshToken,
      },
      recommendations,
    });
  } catch (e: any) {
    console.error("Gmail status check failed:", e);
    return NextResponse.json({ ok: false, error: e?.message || "status_check_failed" }, { status: 500 });
  }
}