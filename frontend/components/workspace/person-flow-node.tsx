"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

import type { PersonNode } from "@/lib/api";

export const PERSON_NODE_WIDTH = 256;
export const PERSON_NODE_HEIGHT = 158;

export type PersonFlowData = {
  person: PersonNode;
};

export type PersonFlowNodeType = Node<PersonFlowData, "person">;

export function PersonFlowNode({
  data,
  dragging,
  selected,
}: NodeProps<PersonFlowNodeType>) {
  const { person } = data;
  const fullName = [person.firstName, person.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="relative isolate w-64 overflow-visible">
      {person.isRoot ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-y-6 -inset-x-6 z-0 rounded-[38px] bg-[radial-gradient(circle_at_14%_50%,rgba(104,176,255,0.54)_0%,rgba(64,124,244,0.24)_44%,transparent_68%),radial-gradient(circle_at_50%_50%,rgba(112,186,255,0.6)_0%,rgba(70,136,255,0.26)_46%,transparent_70%),radial-gradient(circle_at_86%_50%,rgba(104,176,255,0.54)_0%,rgba(64,124,244,0.24)_44%,transparent_68%)] blur-xl"
        />
      ) : null}

      <article
        data-node-card="true"
        className={[
          "relative z-10 w-64 select-none rounded-[28px] border bg-[rgba(28,36,56,0.96)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.36)] backdrop-blur transition-shadow",
          dragging ? "shadow-[0_30px_110px_rgba(0,0,0,0.38)]" : "",
          selected ? "ring-2 ring-[rgba(116,164,255,0.45)]" : "",
          person.isRoot
            ? "border-[rgba(140,190,255,0.78)] shadow-[0_0_0_1px_rgba(140,190,255,0.4),0_0_36px_rgba(88,153,255,0.58),0_0_84px_rgba(70,126,255,0.46),0_32px_110px_rgba(18,36,86,0.52)]"
            : "border-[rgba(255,255,255,0.18)]",
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
                  ? "border-[var(--accent-strong)] bg-[rgba(208,160,96,0.16)] text-[var(--accent-strong)]"
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
                <p className="mt-1 text-sm text-[var(--ink-soft)]">
                  {person.note}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
