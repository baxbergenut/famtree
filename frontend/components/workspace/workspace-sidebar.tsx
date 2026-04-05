"use client";

import type { TreeGraph } from "@/lib/api";
import type { PersonDraft } from "@/components/workspace/types";

type WorkspaceSidebarProps = {
  graph: TreeGraph;
  draft: PersonDraft | null;
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
  const title = getSidebarTitle(draft);
  const eyebrow = draft ? getSidebarEyebrow(draft) : "Tree overview";

  return (
    <aside className="fixed inset-y-0 right-0 z-30 w-[380px] border-l border-[var(--line-soft)] bg-white/86 backdrop-blur-xl">
      <div className="h-full overflow-y-auto px-6 pb-6 pt-[108px]">
        <p className="text-sm font-semibold tracking-[0.2em] text-[var(--accent-strong)] uppercase">
          {eyebrow}
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-[var(--ink-strong)]">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
          Keep the tree readable by shaping people directly on the canvas, then
          use this panel to add, edit, or remove records without leaving the
          workspace.
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
            {draft.mode === "delete" ? (
              <DeletePanel draft={draft} pending={pending} />
            ) : (
              <EditFields draft={draft} onDraftChange={onDraftChange} />
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={pending}
                className={[
                  "rounded-full px-5 py-3 text-sm font-semibold text-white transition disabled:opacity-70",
                  draft.mode === "delete"
                    ? "bg-[#8f4226] hover:bg-[#7a391f]"
                    : "bg-[var(--ink-strong)] hover:bg-[#2c2520]",
                ].join(" ")}
              >
                {getSubmitLabel(draft, pending)}
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
            Select a node action on the canvas to add a parent, add a child,
            edit a person, or remove a branch member. The root person can be
            edited but not deleted.
          </div>
        )}
      </div>
    </aside>
  );
}

function EditFields({
  draft,
  onDraftChange,
}: {
  draft: Exclude<PersonDraft, { mode: "delete" }>;
  onDraftChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
}) {
  return (
    <div className="grid gap-4">
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
          First name
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
          placeholder={draft.mode === "create" ? getCreateNotePlaceholder(draft) : "Optional"}
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
  );
}

function DeletePanel({
  draft,
  pending,
}: {
  draft: Extract<PersonDraft, { mode: "delete" }>;
  pending: boolean;
}) {
  const fullName = [draft.firstName, draft.lastName].filter(Boolean).join(" ").trim();

  return (
    <div className="rounded-[24px] border border-[#e7c6b7] bg-[#fff7f3] p-5 text-sm leading-7 text-[#8f4226]">
      <p className="font-semibold text-[#7a391f]">
        Remove {fullName || "this person"} from the tree?
      </p>
      <p className="mt-2">
        This removes the person record and detaches related connectors. The
        root person stays protected and cannot be deleted.
      </p>
      {draft.note ? <p className="mt-3 text-[#9a5739]">Note: {draft.note}</p> : null}
      {pending ? <p className="mt-3 text-[#9a5739]">Applying changes...</p> : null}
    </div>
  );
}

function getSidebarEyebrow(draft: PersonDraft | null) {
  if (!draft) {
    return "Tree overview";
  }

  switch (draft.mode) {
    case "create":
      return draft.relation === "parent" ? "Add a parent" : "Add a child";
    case "edit":
      return "Edit person";
    case "delete":
      return "Delete person";
  }
}

function getSidebarTitle(draft: PersonDraft | null) {
  if (!draft) {
    return "Choose a node";
  }

  switch (draft.mode) {
    case "create":
      return draft.relation === "parent" ? "Create a parent" : "Create a child";
    case "edit":
      return "Update this person";
    case "delete":
      return "Confirm deletion";
  }
}

function getSubmitLabel(draft: PersonDraft, pending: boolean) {
  if (pending) {
    return draft.mode === "delete" ? "Deleting..." : "Saving...";
  }

  switch (draft.mode) {
    case "create":
      return "Save relative";
    case "edit":
      return "Save changes";
    case "delete":
      return "Delete person";
  }
}

function getCreateNotePlaceholder(draft: Extract<PersonDraft, { mode: "create" }>) {
  return draft.relation === "parent"
    ? "mom, dad, guardian..."
    : "son, daughter, child...";
}
