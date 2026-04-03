import Link from "next/link";

const navItems = [
  { href: "/login", label: "Log in" },
  { href: "/register", label: "Register" },
  { href: "/app", label: "Workspace" },
];

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 lg:px-10">
      <Link href="/" className="flex items-center gap-3 text-sm font-semibold tracking-[0.28em] text-[var(--ink-strong)] uppercase">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line-strong)] bg-white/75 text-base shadow-[0_8px_24px_rgba(36,31,28,0.08)]">
          F
        </span>
        famtree
      </Link>
      <nav className="flex items-center gap-2 rounded-full border border-[var(--line-soft)] bg-white/65 p-1 shadow-[0_16px_40px_rgba(32,27,23,0.08)] backdrop-blur">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-full px-4 py-2 text-sm font-medium text-[var(--ink-soft)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--ink-strong)]"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

