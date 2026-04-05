"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

import type { PersonNode } from "@/lib/api";

export const PERSON_NODE_WIDTH = 256;
export const PERSON_NODE_HEIGHT = 158;

export type PersonFlowData = {
  person: PersonNode;
  onAddParent: (personId: string) => void;
  onAddChild: (personId: string) => void;
  onEditPerson: (personId: string) => void;
  onDeletePerson: (personId: string) => void;
};

export type PersonFlowNodeType = Node<PersonFlowData, "person">;

export function PersonFlowNode({
  data,
  dragging,
}: NodeProps<PersonFlowNodeType>) {
  const { person, onAddParent, onAddChild, onEditPerson, onDeletePerson } = data;
  const fullName = [person.firstName, person.lastName].filter(Boolean).join(" ");

  return (
    <article
      data-node-card="true"
      className={[
        "w-64 select-none rounded-[28px] border bg-white/92 p-5 shadow-[0_24px_80px_rgba(34,27,22,0.12)] backdrop-blur transition-shadow",
        dragging ? "shadow-[0_30px_110px_rgba(34,27,22,0.2)]" : "",
        person.isRoot
          ? "border-[var(--accent-strong)] ring-2 ring-[var(--accent-soft)]"
          : "border-[var(--line-soft)]",
      ].join(" ")}
    >
      <Handle
        id="person-target"
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-0 !bg-transparent"
      />
      <Handle
        id="person-source"
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-0 !bg-transparent"
      />

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={[
              "flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border text-lg font-semibold",
              person.isRoot
                ? "border-[var(--accent-strong)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                : "border-[var(--line-strong)] bg-[var(--surface-muted)] text-[var(--ink-soft)]",
            ].join(" ")}
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 19a4 4 0 0 0-8 0" />
              <circle cx="12" cy="10" r="3.25" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-semibold text-[var(--ink-strong)]">
              {fullName}
            </p>
            {person.note ? (
              <p className="mt-1 text-sm text-[var(--ink-soft)]">{person.note}</p>
            ) : null}
          </div>
        </div>
        {person.isRoot ? (
          <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-[var(--accent-strong)] uppercase">
            Me
          </span>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onAddParent(person.id)}
          className="nodrag rounded-full border border-[var(--line-soft)] px-3 py-2 text-xs font-medium text-[var(--ink-soft)] transition hover:border-[var(--accent-strong)] hover:bg-[var(--accent-soft)]"
        >
          Add parent
        </button>
        <button
          type="button"
          onClick={() => onAddChild(person.id)}
          className="nodrag rounded-full border border-[var(--line-soft)] px-3 py-2 text-xs font-medium text-[var(--ink-soft)] transition hover:border-[var(--accent-strong)] hover:bg-[var(--accent-soft)]"
        >
          Add child
        </button>
        <button
          type="button"
          onClick={() => onEditPerson(person.id)}
          className="nodrag rounded-full border border-[var(--line-soft)] px-3 py-2 text-xs font-medium text-[var(--ink-soft)] transition hover:border-[var(--accent-strong)] hover:bg-[var(--accent-soft)]"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDeletePerson(person.id)}
          disabled={person.isRoot}
          title={person.isRoot ? "The root person cannot be deleted" : undefined}
          className="nodrag rounded-full border border-[#d8b5a5] px-3 py-2 text-xs font-medium text-[#8f4226] transition hover:bg-[#fff1ec] disabled:cursor-not-allowed disabled:opacity-45"
        >
          Delete
        </button>
      </div>
    </article>
  );
}
