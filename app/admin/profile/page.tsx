"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function AdminProfilePage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-neutral-900/90 p-6 shadow-[0_40px_120px_rgba(0,0,0,0.9)]"
      >
        {/* Header */}
        <div className="mb-6">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-fuchsia-500 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/40">
            H
          </div>
          <h1 className="text-xl font-semibold text-white">
            Welcome to HOMI
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            Your Admin space is being prepared.
          </p>
        </div>

        {/* Content */}
        <div className="space-y-3 text-sm text-neutral-300">
          <p>
            We’ve saved your access request and created your workspace.
          </p>
          <p>
            You’ll soon be able to:
          </p>
          <ul className="list-disc list-inside space-y-1 text-neutral-400">
            <li>Connect your portals (SeLoger, LeBonCoin, PAP)</li>
            <li>Import leads and deals</li>
            <li>See real CPL and cost per sale</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/admin"
            className="flex-1 rounded-full bg-fuchsia-500 px-4 py-2 text-center text-sm font-medium text-white shadow-lg shadow-fuchsia-500/40 hover:bg-fuchsia-400"
          >
            Go to dashboard
          </Link>

          <Link
            href="/"
            className="flex-1 rounded-full border border-white/10 px-4 py-2 text-center text-sm text-neutral-300 hover:border-white/20 hover:text-white"
          >
            Back to homepage
          </Link>
        </div>

        {/* Footer */}
        <p className="mt-5 text-center text-[11px] text-neutral-500">
          You can complete your profile and integrations later.
        </p>
      </motion.div>
    </div>
  );
}