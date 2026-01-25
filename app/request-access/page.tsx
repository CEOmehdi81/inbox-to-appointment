"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RequestAccessPage() {
  const router = useRouter();

  // optional: track loading so user can’t double submit
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);

    // If you need to save the lead later, this is where you POST it.
    // For now: redirect directly to Admin profile.
    router.push("/admin/profile");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900/95 p-6 shadow-[0_40px_120px_rgba(0,0,0,0.9)]"
      >
        <Link href="/" className="absolute right-4 top-4 text-neutral-400 hover:text-white">
          ✕
        </Link>

        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-fuchsia-500 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/40">
            H
          </div>
          <h1 className="text-xl font-semibold text-white">Request early access</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Enter your details, then you will land in your Admin profile.
          </p>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="mb-1 block text-xs text-neutral-400">Work email</label>
            <input
              name="email"
              type="email"
              required
              placeholder="you@agency.com"
              className="w-full rounded-lg border border-white/10 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-fuchsia-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-neutral-400">Agency name</label>
            <input
              name="agency"
              type="text"
              placeholder="Dupont Immobilier"
              className="w-full rounded-lg border border-white/10 bg-neutral-800 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:border-fuchsia-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-neutral-400">
              Monthly portal spend (optional)
            </label>
            <select
              name="spend"
              className="w-full rounded-lg border border-white/10 bg-neutral-800 px-3 py-2 text-sm text-white focus:border-fuchsia-500 focus:outline-none"
            >
              <option value="">Select range</option>
              <option value="<1000">{"< 1 000 €"}</option>
              <option value="1-3k">1 000 – 3 000 €</option>
              <option value="3-6k">3 000 – 6 000 €</option>
              <option value="6k+">6 000 €+</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-full bg-fuchsia-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-fuchsia-500/40 hover:bg-fuchsia-400 disabled:opacity-60"
          >
            {loading ? "Redirecting..." : "Continue to Admin"}
          </button>
        </form>

        <p className="mt-4 text-center text-[11px] text-neutral-500">
          You can update these details later in your profile.
        </p>
      </motion.div>
    </div>
  );
}