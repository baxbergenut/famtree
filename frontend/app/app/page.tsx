import { CanvasPreview } from "@/components/canvas-preview";
import { SiteHeader } from "@/components/site-header";
import { WorkspaceStatus } from "@/components/workspace-status";

export default function WorkspacePage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-16 pt-8 lg:px-10">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-[0.24em] text-[var(--accent-strong)] uppercase">
              Workspace shell
            </p>
            <h1 className="mt-3 font-serif-display text-5xl leading-none text-[var(--ink-strong)]">
              Borderless canvas foundation
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--ink-soft)]">
              This route previews the canvas experience we will connect to real graph data next: root-focused entry, person cards, edge structure, zoom controls, and room for direct add-parent and add-child actions.
            </p>
          </div>
          <div className="flex gap-3">
            <span className="rounded-full border border-[var(--line-soft)] bg-white/70 px-4 py-2 text-sm text-[var(--ink-soft)]">
              Backend hook-up next
            </span>
            <span className="rounded-full border border-[var(--line-soft)] bg-[var(--accent-soft)] px-4 py-2 text-sm text-[var(--accent-strong)]">
              Root highlighted
            </span>
          </div>
        </section>

        <WorkspaceStatus />
        <CanvasPreview />
      </main>
    </div>
  );
}
