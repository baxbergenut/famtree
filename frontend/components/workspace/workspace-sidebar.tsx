"use client";

import type { TreeGraph } from "@/lib/api";
import type { RelativeDraft } from "@/components/workspace/types";

type WorkspaceSidebarProps = {
  graph: TreeGraph;
  draft: RelativeDraft | null;
  pending: boolean;
  error: string | null;
  unionChildLinkCount: number;
  onDraftChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

export function WorkspaceSidebar({
  graph,
  draft,
  pending,
  error,
  unionChildLinkCount,
  onDraftChange,
  onSubmit,
  onCancel,
}: WorkspaceSidebarProps) {
  return (
    <aside className="fixed inset-y-0 right-0 z-30 w-[380px] border-l border-[var(--line-soft)] bg-white/86 backdrop-blur-xl">
      <div className="h-full overflow-y-auto px-6 pb-6 pt-[108px]">
        <p className="text-sm font-semibold tracking-[0.2em] text-[var(--accent-strong)] uppercase">
          Add a relative
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-[var(--ink-strong)]">
          {draft
            ? draft.relation === "parent"
              ? "Create a parent"
              : "Create a child"
            : "Choose a node"}
        </h2>
        <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
          The canvas is now driven by person nodes and union nodes, so parent
          links and child links are rendered as one readable DAG instead of
          custom SVG logic.
        </p>

        <div className="mt-6 rounded-[24px] border border-[var(--line-soft)] bg-[var(--surface-muted)]/55 p-4 text-sm text-[var(--ink-soft)]">
          <p>
            <span className="font-semibold text-[var(--ink-strong)]">
              {graph.persons.length}
            </span>{" "}
            people
          </p>
          <p className="mt-1">
            <span className="font-semibold text-[var(--ink-strong)]">
              {graph.unions.length}
            </span>{" "}
            unions
          </p>
          <p className="mt-1">
            <span className="font-semibold text-[var(--ink-strong)]">
              {unionChildLinkCount}
            </span>{" "}
            child links
          </p>
        </div>

        {error ? (
          <section className="mt-5 rounded-[24px] border border-[#d8b5a5] bg-[#fff1ec] p-4 text-sm text-[#8f4226]">
            {error}
          </section>
        ) : null}

        {draft ? (
          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div className="grid gap-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                  Name
                </span>
                <input
                  name="firstName"
                  value={draft.firstName}
                  onChange={onDraftChange}
                  type="text"
                  className="w-full rounded-2xl border border-[var(--line-soft)] bg-white px-4 py-3 text-sm text-[var(--ink-strong)] outline-none transition focus:border-[var(--accent-strong)]"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                  Last name
                </span>
                <input
                  name="lastName"
                  value={draft.lastName}
                  onChange={onDraftChange}
                  type="text"
                  placeholder="Optional"
                  className="w-full rounded-2xl border border-[var(--line-soft)] bg-white px-4 py-3 text-sm text-[var(--ink-strong)] outline-none transition focus:border-[var(--accent-strong)]"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                  Note
                </span>
                <input
                  name="note"
                  value={draft.note}
                  onChange={onDraftChange}
                  type="text"
                  placeholder={
                    draft.relation === "parent"
                      ? "mom, dad, guardian..."
                      : "son, daughter, child..."
                  }
                  className="w-full rounded-2xl border border-[var(--line-soft)] bg-white px-4 py-3 text-sm text-[var(--ink-strong)] outline-none transition focus:border-[var(--accent-strong)]"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                  Birth date
                </span>
                <input
                  name="birthDate"
                  value={draft.birthDate}
                  onChange={onDraftChange}
                  type="date"
                  className="w-full rounded-2xl border border-[var(--line-soft)] bg-white px-4 py-3 text-sm text-[var(--ink-strong)] outline-none transition focus:border-[var(--accent-strong)]"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={pending}
                className="rounded-full bg-[var(--ink-strong)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2c2520] disabled:opacity-70"
              >
                {pending ? "Saving..." : "Save relative"}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="rounded-full border border-[var(--line-strong)] bg-[var(--surface-muted)] px-5 py-3 text-sm font-semibold text-[var(--ink-strong)] transition hover:border-[var(--accent-strong)] hover:bg-[var(--accent-soft)]"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-6 rounded-[24px] border border-dashed border-[var(--line-strong)] bg-[var(--surface-muted)]/60 p-5 text-sm leading-7 text-[var(--ink-soft)]">
            Start from your highlighted node, then add parents or children. The
            union nodes stay hidden in the form flow but drive the graph layout
            under the hood.
          </div>
        )}
      </div>
    </aside>
  );
}
