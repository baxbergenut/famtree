import Link from "next/link";

const navItems = [
  { href: "/login", label: "Log in" },
  { href: "/register", label: "Register" },
  { href: "/app", label: "Workspace" },
];

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 lg:px-10">
      <Link
        href="/"
        className="flex items-center gap-3 text-sm font-semibold tracking-[0.28em] text-(--ink-strong) uppercase"
      >
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-(--line-strong) bg-[rgba(255,255,255,0.05)] text-base shadow-[0_8px_24px_rgba(0,0,0,0.24)]">
          F
        </span>
        famdawg
      </Link>
      <nav className="flex items-center gap-2 rounded-full border border-(--line-soft) bg-[rgba(10,15,25,0.78)] p-1 shadow-[0_16px_40px_rgba(0,0,0,0.3)] backdrop-blur">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-full px-4 py-2 text-sm font-medium text-(--ink-soft) transition hover:bg-[rgba(208,160,96,0.16)] hover:text-(--ink-strong)"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
