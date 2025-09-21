// lib/settings.ts
import prisma from "@/lib/prisma";

export type SettingsInput = {
  orgName?: string | null;
  supportEmail?: string | null;
  brandPrimary?: string;
  brandLime?: string;
  brandCard?: string;
  timezone?: string;
  dailyDigest?: boolean;
};

const DEFAULTS = {
  orgName: "HOMI",
  supportEmail: "hello@example.com",
  brandPrimary: "#7C5CFF",
  brandLime: "#D1FF25",
  brandCard: "#0B0B0C",
  timezone: "UTC",
  dailyDigest: false,
};

export async function getSettings() {
  const one = await prisma.appSettings.findFirst();
  if (one) return one;
  return prisma.appSettings.create({ data: DEFAULTS });
}

export async function updateSettings(input: SettingsInput) {
  const current = await getSettings();
  return prisma.appSettings.update({
    where: { id: current.id },
    data: {
      orgName: input.orgName ?? current.orgName,
      supportEmail: input.supportEmail ?? current.supportEmail,
      brandPrimary: input.brandPrimary ?? current.brandPrimary,
      brandLime: input.brandLime ?? current.brandLime,
      brandCard: input.brandCard ?? current.brandCard,
      timezone: input.timezone ?? current.timezone,
      dailyDigest:
        typeof input.dailyDigest === "boolean"
          ? input.dailyDigest
          : current.dailyDigest,
    },
  });
}