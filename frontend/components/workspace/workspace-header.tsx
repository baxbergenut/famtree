"use client";

import Link from "next/link";

type WorkspaceHeaderProps = {
  headerName: string;
  email: string;
  loggingOut: boolean;
  onLogout: () => void;
};

export function WorkspaceHeader({
  headerName,
  email,
  loggingOut,
  onLogout,
}: WorkspaceHeaderProps) {
  return (
    <header className="fixed left-0 right-0 top-0 z-30 flex h-[84px] items-center justify-between px-6 lg:px-8">
      <div className="flex items-center gap-3 rounded-full border border-[var(--line-soft)] bg-white/84 px-4 py-3 shadow-[0_16px_48px_rgba(32,27,23,0.12)] backdrop-blur">
        <Link
          href="/"
          className="flex items-center gap-3 text-sm font-semibold tracking-[0.28em] text-[var(--ink-strong)] uppercase"
        >
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line-strong)] bg-white text-base shadow-[0_8px_24px_rgba(36,31,28,0.08)]">
            F
          </span>
          famtree
        </Link>
        <span className="rounded-full bg-[var(--accent-soft)] px-3 py-2 text-xs font-semibold tracking-[0.2em] text-[var(--accent-strong)] uppercase">
          Canvas
        </span>
      </div>

      <div className="flex items-center gap-3 rounded-full border border-[var(--line-soft)] bg-white/84 px-4 py-3 shadow-[0_16px_48px_rgba(32,27,23,0.12)] backdrop-blur">
        <div className="hidden text-right lg:block">
          <p className="text-sm font-semibold text-[var(--ink-strong)]">
            {headerName}
          </p>
          <p className="text-xs text-[var(--ink-soft)]">{email}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          className="rounded-full border border-[var(--line-strong)] bg-[var(--surface-muted)] px-4 py-2 text-sm font-semibold text-[var(--ink-strong)] transition hover:border-[var(--accent-strong)] hover:bg-[var(--accent-soft)] disabled:opacity-70"
        >
          {loggingOut ? "Logging out..." : "Log out"}
        </button>
      </div>
    </header>
  );
}
