import Link from "next/link";

const ADMIN = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";

export default function Navbar() {
  return (
    <header className="flex items-center justify-between px-6 py-4">
      <Link href="/" className="font-semibold">
        HOMI
      </Link>

      <nav className="flex items-center gap-4">
        <Link href="/product">Product</Link>
        <Link href="/results">Results</Link>
        <Link href="/pricing">Pricing</Link>
        <Link href="/faq">FAQ</Link>

        <a
          href={`${ADMIN}/`}
          className="text-sm opacity-80 hover:opacity-100"
        >
          Open Admin
        </a>

        <a
          href={`${ADMIN}/demo`}
          className="text-sm opacity-80 hover:opacity-100"
        >
          Demo
        </a>

        <a
          href={`${ADMIN}/login`}
          className="text-sm"
        >
          Log in
        </a>

        <Link
          href="/request-access"
          className="rounded-full px-4 py-2 text-sm font-semibold"
        >
          Request early access
        </Link>
      </nav>
    </header>
  );
}