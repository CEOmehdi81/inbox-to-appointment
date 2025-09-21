// app/admin/settings/page.tsx
import { revalidatePath } from "next/cache";
import { getSettings, updateSettings } from "@/lib/settings";
// If you already have a timezone list somewhere, import it instead of TZ.
const TZ = [
  "UTC",
  "Europe/Paris",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Singapore",
] as const;

export default async function SettingsPage() {
  const s = await getSettings();

  async function save(formData: FormData) {
    "use server";

    const orgName = (formData.get("orgName") as string)?.trim() || s.orgName;
    const supportEmail =
      (formData.get("supportEmail") as string)?.trim() || s.supportEmail;

    const brandPrimary =
      (formData.get("brandPrimary") as string) || s.brandPrimary;
    const brandLime = (formData.get("brandLime") as string) || s.brandLime;
    const brandCard = (formData.get("brandCard") as string) || s.brandCard;

    const timezone = (formData.get("timezone") as string) || s.timezone;
    const dailyDigest = formData.get("dailyDigest") === "on";

    await updateSettings({
      orgName,
      supportEmail,
      brandPrimary,
      brandLime,
      brandCard,
      timezone,
      dailyDigest,
    });

    // Re-render the admin layout so CSS variables + timezone apply immediately.
    revalidatePath("/admin", "layout");
    revalidatePath("/admin/settings");
  }

  return (
    <form action={save} className="space-y-6">
      {/* Organization */}
      <section className="bg-[color:var(--brand-card)] border border-white/10 rounded-2xl p-4">
        <h2 className="text-sm font-medium mb-4">Organization</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="block text-gray-400 mb-1">Name</span>
            <input
              name="orgName"
              defaultValue={s.orgName ?? ""}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/20"
              placeholder="HOMI"
            />
          </label>

          <label className="text-sm">
            <span className="block text-gray-400 mb-1">Support email</span>
            <input
              type="email"
              name="supportEmail"
              defaultValue={s.supportEmail ?? ""}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/20"
              placeholder="hello@example.com"
            />
          </label>
        </div>
      </section>

      {/* Theme colors */}
      <section className="bg-[color:var(--brand-card)] border border-white/10 rounded-2xl p-4">
        <h2 className="text-sm font-medium mb-4">Theme colors</h2>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm">
            <span className="block text-gray-400 mb-1">Primary</span>
            <input
              type="color"
              name="brandPrimary"
              defaultValue={s.brandPrimary ?? "#7C5CFF"}
              className="h-10 w-full rounded-lg bg-transparent cursor-pointer"
            />
          </label>

          <label className="text-sm">
            <span className="block text-gray-400 mb-1">Accent (lime)</span>
            <input
              type="color"
              name="brandLime"
              defaultValue={s.brandLime ?? "#D1FF25"}
              className="h-10 w-full rounded-lg bg-transparent cursor-pointer"
            />
          </label>

          <label className="text-sm">
            <span className="block text-gray-400 mb-1">Card / Panel</span>
            <input
              type="color"
              name="brandCard"
              defaultValue={s.brandCard ?? "#0B0B0C"}
              className="h-10 w-full rounded-lg bg-transparent cursor-pointer"
            />
          </label>
        </div>

        {/* Tiny live preview strip */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div
            className="h-2 rounded-lg"
            style={{ background: s.brandPrimary }}
            title="Primary"
          />
          <div
            className="h-2 rounded-lg"
            style={{ background: s.brandLime }}
            title="Lime"
          />
          <div
            className="h-2 rounded-lg"
            style={{ background: s.brandCard }}
            title="Card"
          />
        </div>
      </section>

      {/* Timezone + digest */}
      <section className="bg-[color:var(--brand-card)] border border-white/10 rounded-2xl p-4">
        <h2 className="text-sm font-medium mb-4">Preferences</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm">
            <span className="block text-gray-400 mb-1">Timezone</span>
            <select
              name="timezone"
              defaultValue={s.timezone ?? "UTC"}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/20"
            >
              {TZ.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm inline-flex items-center gap-3 mt-6 md:mt-0">
            <input
              type="checkbox"
              name="dailyDigest"
              defaultChecked={!!s.dailyDigest}
              className="h-4 w-4 rounded border-white/20 bg-white/5"
            />
            <span>Send daily email digest</span>
          </label>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm hover:bg-white/10"
        >
          Save changes
        </button>
      </div>
    </form>
  );
}