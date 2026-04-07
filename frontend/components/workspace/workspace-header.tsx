"use client";

import Link from "next/link";

export function WorkspaceHeader() {
  return (
    <header className="fixed left-0 right-0 top-0 z-30 flex h-[84px] items-center px-6 lg:px-8">
      <div className="apple-liquid-panel apple-liquid-regular flex items-center gap-3 rounded-[28px] px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-3 text-sm font-semibold tracking-[0.28em] text-(--ink-strong) uppercase"
        >
          <span className="apple-liquid-badge inline-flex h-10 w-10 items-center justify-center rounded-full text-base font-bold text-white">
            F
          </span>
          famdawg
        </Link>
        <span className="apple-liquid-badge rounded-full px-3 py-2 text-xs font-semibold tracking-[0.2em] text-(--ink-strong) uppercase">
          Canvas
        </span>
      </div>
    </header>
  );
}
