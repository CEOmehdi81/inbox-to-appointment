"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";

const ADMIN = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

const float: Variants = {
  initial: { y: 0 },
  animate: {
    y: -8,
    transition: {
      duration: 3,
      repeat: Infinity,
      repeatType: "reverse",
      ease: "easeInOut",
    },
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -right-32 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute top-40 -left-20 h-80 w-80 rounded-full bg-sky-500/15 blur-3xl" />
      </div>

      {/* Top navigation */}
      <header className="relative z-20 border-b border-white/5">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-fuchsia-500 text-xs font-semibold text-white shadow-lg shadow-fuchsia-500/40">
              H
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-wide">HOMI</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-400">
                Portal performance
              </span>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-xs text-neutral-300 md:flex">
            <Link href="#product" className="hover:text-white">
              Product
            </Link>
            <Link href="#metrics" className="hover:text-white">
              Results
            </Link>
            <Link href="#pricing" className="hover:text-white">
              Pricing
            </Link>
            <Link href="#faq" className="hover:text-white">
              FAQ
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={`${ADMIN}/`}
              className="hidden text-xs text-neutral-300 hover:text-white md:inline"
            >
              Open Admin
            </a>

            <a
              href={`${ADMIN}/demo`}
              className="hidden text-xs text-neutral-300 hover:text-white md:inline"
            >
              Demo
            </a>

            <Link
              href="/admin"
              className="hidden text-xs text-neutral-300 hover:text-white md:inline"
            >
              Log in
            </Link>

            {/* ✅ FIX: was #cta */}
            <Link
              href="/request-access"
              className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-neutral-900 shadow-lg shadow-white/20 hover:bg-neutral-100"
            >
              Request early access
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* HERO */}
        <section className="border-b border-white/5">
          <div className="mx-auto max-w-4xl px-4 py-20 text-center">
            {/* Badge */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] text-neutral-300"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Real-time insight from your live portal spend
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="mt-4 text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl"
            >
              See exactly which portals bring real viewings and real sales.
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              transition={{ delay: 0.1 }}
              className="mx-auto mt-4 max-w-2xl text-sm text-neutral-300 md:text-base"
            >
              HOMI connects your portals, CRM and signed deals so you finally see
              which listings and campaigns actually create appointments and
              completions. No more guessing. No more paying for results you don’t
              get.
            </motion.p>

            {/* CTA */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              transition={{ delay: 0.2 }}
              className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
            >
              {/* ✅ FIX: was #cta */}
              <Link
                href="/request-access"
                className="rounded-full bg-fuchsia-500 px-6 py-2 text-xs font-medium text-white shadow-lg shadow-fuchsia-500/40 hover:bg-fuchsia-400"
              >
                Get early access
              </Link>

              <Link
                href="#product"
                className="text-xs text-neutral-300 hover:text-white"
              >
                Watch how it works
              </Link>

              <span className="text-[11px] text-neutral-400">
                Works with SeLoger, LeBonCoin, PAP and more.
              </span>
            </motion.div>

            {/* Feature cards */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              transition={{ delay: 0.35 }}
              className="mx-auto mt-10 grid max-w-3xl gap-4 text-xs text-neutral-200 sm:grid-cols-3"
            >
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  Attribution
                </div>
                <p className="mt-1 text-[11px] text-neutral-200">
                  Every lead auto-tagged with portal, listing and negotiator.
                </p>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  Spend clarity
                </div>
                <p className="mt-1 text-[11px] text-neutral-200">
                  True cost per lead and cost per sale for every portal package.
                </p>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  Actionable insights
                </div>
                <p className="mt-1 text-[11px] text-neutral-200">
                  Listing health scores that tell you exactly which owners to
                  call today.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Animated hero card */}
        <section className="mt-10 flex justify-center pb-16">
          <motion.div
            className="relative w-full max-w-md"
            variants={float}
            initial="initial"
            animate="animate"
          >
            {/* Glows */}
            <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-fuchsia-500/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-sky-500/25 blur-3xl" />

            {/* Main CPL card */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-neutral-900/95 via-neutral-900/90 to-neutral-950/95 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.8)] backdrop-blur">
              <div className="mb-2 flex items-center justify-between text-[11px] text-neutral-300">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="uppercase tracking-[0.18em] text-neutral-400">
                    Live CPL by portal
                  </span>
                </div>
                <span className="rounded-full bg-neutral-800/80 px-2 py-0.5 text-[10px] text-neutral-400">
                  Demo account
                </span>
              </div>

              <div className="mb-3 flex items-center justify-between text-[10px] text-neutral-400">
                <span>This month · All listings</span>
                <span className="rounded-full bg-fuchsia-500/10 px-2 py-0.5 text-[10px] text-fuchsia-300">
                  AI budget suggestion
                </span>
              </div>

              <div className="space-y-3 text-[11px]">
                {[
                  { portal: "LeBonCoin", value: 32, delta: "+9", good: true },
                  { portal: "SeLoger", value: 41, delta: "+3", good: false },
                  { portal: "PAP", value: 18, delta: "-6", good: true },
                  { portal: "LogicImmo", value: 27, delta: "-2", good: true },
                ].map((row) => (
                  <div key={row.portal}>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-200">{row.portal}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-400">{row.value} € CPL</span>
                        <span
                          className={[
                            "rounded-full px-1.5 py-0.5 text-[10px]",
                            row.good
                              ? "bg-emerald-500/10 text-emerald-300"
                              : "bg-amber-500/10 text-amber-300",
                          ].join(" ")}
                        >
                          {row.delta}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-neutral-800">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 via-violet-500 to-sky-400"
                        style={{ width: `${row.value + 25}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-900/10 p-3 text-[11px] text-neutral-200">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-neutral-100">
                    Recommendation for next month
                  </span>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">
                    +24 viewings / month
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-neutral-300">
                  Shift <span className="font-medium text-neutral-100">900 €</span>{" "}
                  from <span className="font-medium text-neutral-100">SeLoger</span>{" "}
                  to <span className="font-medium text-neutral-100">LeBonCoin</span>{" "}
                  and <span className="font-medium text-neutral-100">PAP</span>.
                  Keep total spend constant and CPL below{" "}
                  <span className="font-medium text-neutral-100">28 €</span>.
                </p>
              </div>
            </div>

            {/* Listing health snapshot */}
            <motion.div
              className="relative mt-4 rounded-xl border border-white/10 bg-neutral-900/80 p-3 text-[11px] text-neutral-200 backdrop-blur"
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              transition={{ delay: 0.4 }}
            >
              <div className="mb-1 flex items-center justify-between">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  Listing health snapshot
                </div>
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
                  8 need attention
                </span>
              </div>
              <p className="text-neutral-300">
                8 listings have had <span className="font-medium">0 viewings</span>{" "}
                in the last <span className="font-medium">20 days</span>. Focus
                on price, photos and portal placement for these owners first.
              </p>
            </motion.div>
          </motion.div>
        </section>

        {/* Product section */}
        <section id="product" className="border-b border-white/5 bg-neutral-950">
          <div className="mx-auto max-w-5xl space-y-10 px-4 py-16">
            <motion.div initial="hidden" animate="visible" variants={fadeUp}>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
                What HOMI actually does
              </h2>
              <p className="mt-3 text-lg font-semibold text-white">
                For estate agencies that spend real money on SeLoger, LeBonCoin,
                PAP and others and want a straight answer to one question:
                <span className="block text-fuchsia-300">
                  “Which portals and listings are actually worth paying for?”
                </span>
              </p>
              <p className="mt-3 max-w-3xl text-sm text-neutral-300">
                HOMI sits on top of your portal invoices, leads and deals and
                turns them into simple, daily instructions: where to keep
                spending, where to cut, and which owners to call first.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              transition={{ delay: 0.15 }}
              className="grid gap-4 text-sm md:grid-cols-3"
            >
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  1. Track every lead
                </div>
                <p className="text-[13px] leading-snug text-neutral-200">
                  Every enquiry is tagged with{" "}
                  <span className="font-medium">
                    portal, listing, negotiator and campaign
                  </span>
                  . No more guessing “this lead came from somewhere on SeLoger”.
                </p>
                <p className="mt-3 text-[11px] text-neutral-400">
                  Outcome: you can finally trust your numbers when you say “this
                  portal doesn’t work”.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  2. See real portal ROI
                </div>
                <p className="text-[13px] leading-snug text-neutral-200">
                  HOMI joins{" "}
                  <span className="font-medium">
                    portal invoices, leads and signed deals
                  </span>{" "}
                  to show CPL, cost per qualified lead and cost per sale for
                  every package and option you buy.
                </p>
                <p className="mt-3 text-[11px] text-neutral-400">
                  Outcome: you know exactly which invoices to renegotiate or
                  cancel.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  3. Get daily actions
                </div>
                <p className="text-[13px] leading-snug text-neutral-200">
                  HOMI scores each listing and portal and turns it into a task
                  list:
                  <span className="font-medium">
                    {" "}
                    call these 5 owners, push these 3 listings, cut spend here
                  </span>
                  .
                </p>
                <p className="mt-3 text-[11px] text-neutral-400">
                  Outcome: your negotiators know exactly what to do when they
                  open the dashboard in the morning.
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Metrics section */}
        <section id="metrics" className="border-b border-white/5 bg-neutral-950">
          <div className="mx-auto max-w-5xl space-y-10 px-4 py-16">
            <motion.div initial="hidden" animate="visible" variants={fadeUp}>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-400">
                Results you should expect
              </h2>
              <p className="mt-3 text-lg font-semibold text-white">
                HOMI is built for agencies that already spend on portals and are
                tired of guessing what actually works.
              </p>
              <p className="mt-3 max-w-3xl text-sm text-neutral-300">
                You can plug in your current portals and CRM and see, in the
                first month, where you are buying viewings and where you are
                just buying clicks.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              transition={{ delay: 0.15 }}
              className="grid gap-4 text-sm md:grid-cols-3"
            >
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-2xl font-semibold text-white">
                  -20% to -35%
                </div>
                <div className="mt-1 text-[12px] font-medium text-neutral-300">
                  spend moved from low ROI portals
                </div>
                <p className="mt-2 text-[11px] text-neutral-400">
                  When you finally see cost per viewing and cost per sale by
                  portal and package, there is always dead weight to cut or
                  renegotiate.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-2xl font-semibold text-white">
                  +15% to +30%
                </div>
                <div className="mt-1 text-[12px] font-medium text-neutral-300">
                  more viewings from the same budget
                </div>
                <p className="mt-2 text-[11px] text-neutral-400">
                  Budget is pushed into the listings and portals that actually
                  create appointments instead of impression numbers on a PDF.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-2xl font-semibold text-white">
                  &lt; 10 minutes
                </div>
                <div className="mt-1 text-[12px] font-medium text-neutral-300">
                  to see what to do today
                </div>
                <p className="mt-2 text-[11px] text-neutral-400">
                  A single view that tells you which owners to call, which
                  listings to push and which invoices to challenge. No Excel
                  gymnastics.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              transition={{ delay: 0.3 }}
              className="rounded-2xl border border-white/10 bg-neutral-900/80 p-4 text-[11px] text-neutral-200 shadow-[0_22px_60px_rgba(0,0,0,0.7)] backdrop-blur"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                    Example portal snapshot
                  </div>
                  <p className="mt-1 text-neutral-300">
                    Same 4 portals. Same budget. Different allocation based on
                    cost per viewing.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-medium text-emerald-300">
                  +23 viewings this month - simulated
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-neutral-400">
                    Before HOMI
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { portal: "SeLoger", cpl: 72 },
                      { portal: "LeBonCoin", cpl: 48 },
                      { portal: "PAP", cpl: 61 },
                      { portal: "LogicImmo", cpl: 69 },
                    ].map((row) => (
                      <div
                        key={`before-${row.portal}`}
                        className="flex items-center justify-between"
                      >
                        <span className="text-neutral-300">{row.portal}</span>
                        <span className="text-neutral-500">
                          {row.cpl} € / lead
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-[0.16em] text-emerald-400">
                    After reallocation
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { portal: "SeLoger", cpl: 55 },
                      { portal: "LeBonCoin", cpl: 32 },
                      { portal: "PAP", cpl: 29 },
                      { portal: "LogicImmo", cpl: 46 },
                    ].map((row) => (
                      <div
                        key={`after-${row.portal}`}
                        className="flex items-center justify-between"
                      >
                        <span className="text-neutral-200">{row.portal}</span>
                        <span className="text-neutral-200">
                          {row.cpl} € / lead
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* You can add pricing / FAQ etc later */}
      </main>
    </div>
  );
}