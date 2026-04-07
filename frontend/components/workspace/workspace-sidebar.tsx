"use client";

import type { TreeGraph } from "@/lib/api";
import type { PersonDraft } from "@/components/workspace/types";

type WorkspaceSidebarProps = {
  graph: TreeGraph;
  selectedPerson: TreeGraph["persons"][number] | null;
  draft: PersonDraft | null;
  pending: boolean;
  error: string | null;
  unionChildLinkCount: number;
  onAddParent: () => void;
  onAddChild: () => void;
  onEditPerson: () => void;
  onDeletePerson: () => void;
  onDraftChange: (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

export function WorkspaceSidebar({
  graph,
  selectedPerson,
  draft,
  pending,
  error,
  unionChildLinkCount,
  onAddParent,
  onAddChild,
  onEditPerson,
  onDeletePerson,
  onDraftChange,
  onSubmit,
  onCancel,
}: WorkspaceSidebarProps) {
  const title = draft
    ? getSidebarTitle(draft)
    : selectedPerson
      ? `${selectedPerson.firstName} ${selectedPerson.lastName}`.trim()
      : "Choose a node";
  const eyebrow = draft
    ? getSidebarEyebrow(draft)
    : selectedPerson
      ? "Selected person"
      : "Tree overview";

  return (
    <aside className="fixed inset-y-0 right-0 z-30 w-[380px] border-l border-[var(--line-soft)] bg-[rgba(8,12,20,0.9)] backdrop-blur-xl">
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

        <div className="mt-6 rounded-[24px] border border-[var(--line-soft)] bg-[rgba(255,255,255,0.03)] p-4 text-sm text-[var(--ink-soft)]">
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
          <section className="mt-5 rounded-[24px] border border-[rgba(255,120,120,0.28)] bg-[rgba(255,120,120,0.1)] p-4 text-sm text-[#f0a3a3]">
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
                    ? "bg-[#aa5a42] hover:bg-[#8f4a35]"
                    : "bg-[var(--ink-strong)] hover:bg-[#fff3d6] hover:text-[#08101d]",
                ].join(" ")}
              >
                {getSubmitLabel(draft, pending)}
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="rounded-full border border-[var(--line-strong)] bg-[var(--surface-muted)] px-5 py-3 text-sm font-semibold text-[var(--ink-strong)] transition hover:border-[var(--accent-strong)] hover:bg-[rgba(208,160,96,0.12)]"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : selectedPerson ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-[24px] border border-[var(--line-soft)] bg-[rgba(255,255,255,0.03)] p-5">
              <p className="text-lg font-semibold text-[var(--ink-strong)]">
                {selectedPerson.firstName} {selectedPerson.lastName}
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
                {selectedPerson.note || "No note yet."}
              </p>
              <p className="mt-2 text-xs text-[var(--ink-soft)]">
                Birth date: {selectedPerson.birthDate || "Not set"}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onAddParent}
                className="rounded-full border border-[var(--line-strong)] bg-[var(--surface-muted)] px-4 py-2 text-sm font-semibold text-[var(--ink-strong)] transition hover:border-[var(--accent-strong)] hover:bg-[rgba(208,160,96,0.12)]"
              >
                Add parent
              </button>
              <button
                type="button"
                onClick={onAddChild}
                className="rounded-full border border-[var(--line-strong)] bg-[var(--surface-muted)] px-4 py-2 text-sm font-semibold text-[var(--ink-strong)] transition hover:border-[var(--accent-strong)] hover:bg-[rgba(208,160,96,0.12)]"
              >
                Add child
              </button>
              <button
                type="button"
                onClick={onEditPerson}
                className="rounded-full border border-[var(--line-strong)] bg-[var(--surface-muted)] px-4 py-2 text-sm font-semibold text-[var(--ink-strong)] transition hover:border-[var(--accent-strong)] hover:bg-[rgba(208,160,96,0.12)]"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={onDeletePerson}
                disabled={selectedPerson.isRoot}
                title={
                  selectedPerson.isRoot
                    ? "The root person cannot be deleted"
                    : undefined
                }
                className="rounded-full border border-[rgba(255,120,120,0.28)] px-4 py-2 text-sm font-semibold text-[#f09a9a] transition hover:bg-[rgba(255,120,120,0.12)] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-[24px] border border-dashed border-[var(--line-strong)] bg-[rgba(255,255,255,0.03)] p-5 text-sm leading-7 text-[var(--ink-soft)]">
            Select a person node to view details and run actions from this
            panel. The root person can be edited but not deleted.
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
          className="w-full rounded-2xl border border-[var(--line-soft)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--ink-strong)] outline-none transition focus:border-[var(--accent-strong)]"
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
          className="w-full rounded-2xl border border-[var(--line-soft)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--ink-strong)] outline-none transition focus:border-[var(--accent-strong)]"
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
            draft.mode === "create"
              ? getCreateNotePlaceholder(draft)
              : "Optional"
          }
          className="w-full rounded-2xl border border-[var(--line-soft)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--ink-strong)] outline-none transition focus:border-[var(--accent-strong)]"
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
          className="w-full rounded-2xl border border-[var(--line-soft)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--ink-strong)] outline-none transition focus:border-[var(--accent-strong)]"
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
  const fullName = [draft.firstName, draft.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    <div className="rounded-[24px] border border-[rgba(255,120,120,0.22)] bg-[rgba(255,120,120,0.08)] p-5 text-sm leading-7 text-[#f0a3a3]">
      <p className="font-semibold text-[#ffd1d1]">
        Remove {fullName || "this person"} from the tree?
      </p>
      <p className="mt-2">
        This removes the person record and detaches related connectors. The root
        person stays protected and cannot be deleted.
      </p>
      {draft.note ? (
        <p className="mt-3 text-[#f0b0b0]">Note: {draft.note}</p>
      ) : null}
      {pending ? (
        <p className="mt-3 text-[#f0b0b0]">Applying changes...</p>
      ) : null}
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

function getCreateNotePlaceholder(
  draft: Extract<PersonDraft, { mode: "create" }>,
) {
  return draft.relation === "parent"
    ? "mom, dad, guardian..."
    : "son, daughter, child...";
}
