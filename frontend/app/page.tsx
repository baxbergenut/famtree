import Link from "next/link";

import { CanvasPreview } from "@/components/canvas-preview";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 pb-16 pt-8 lg:px-10">
        <section className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold tracking-[0.26em] text-(--accent-strong) uppercase">
              Build your story visually
            </p>
            <h1 className="mt-5 max-w-2xl font-serif-display text-6xl leading-none text-(--ink-strong) sm:text-7xl">
              A family tree workspace that starts with you.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-(--ink-soft)">
              famdawg is a calm, modern canvas for mapping parents, children,
              and union nodes without forcing your family into a cramped form.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-full bg-(--ink-strong) px-6 py-3 text-sm font-semibold text-[#07101d] transition hover:bg-[#fff3d6]"
              >
                Create account
              </Link>
              <Link
                href="/app"
                className="inline-flex items-center justify-center rounded-full border border-(--line-strong) bg-[rgba(255,255,255,0.04)] px-6 py-3 text-sm font-semibold text-(--ink-strong) transition hover:border-(--accent-strong) hover:bg-[rgba(208,160,96,0.12)]"
              >
                View workspace shell
              </Link>
            </div>
          </div>
          <div className="rounded-[40px] border border-(--line-soft) bg-[rgba(10,15,25,0.7)] p-4 shadow-[0_36px_120px_rgba(0,0,0,0.28)] backdrop-blur">
            <CanvasPreview />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Root-first flow",
              text: "A new account opens on the signed-in user as the highlighted root person, centered and ready to expand.",
            },
            {
              title: "Union-node graph",
              text: "Parents and children meet through explicit union nodes, which keeps the data clean and makes the rendered family graph easier to reason about.",
            },
            {
              title: "Photo-ready nodes",
              text: "Each person supports a profile photo, fallback icon, note, and stored birth date without cluttering the card.",
            },
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-[28px] border border-(--line-soft) bg-[rgba(10,15,25,0.68)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)]"
            >
              <h2 className="text-xl font-semibold text-(--ink-strong)">
                {item.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-(--ink-soft)">
                {item.text}
              </p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
