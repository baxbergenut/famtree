type PersonNodePreviewProps = {
  firstName: string;
  lastName: string;
  note?: string;
  highlighted?: boolean;
  compact?: boolean;
  isDragging?: boolean;
  onPointerDown?: (event: React.PointerEvent<HTMLElement>) => void;
  onAddParent?: () => void;
  onAddChild?: () => void;
};

export function PersonNodePreview({
  firstName,
  lastName,
  note,
  highlighted = false,
  compact = false,
  isDragging = false,
  onPointerDown,
  onAddParent,
  onAddChild,
}: PersonNodePreviewProps) {
  return (
    <article
      onPointerDown={onPointerDown}
      data-node-card="true"
      className={[
        compact ? "w-60" : "w-64",
        "select-none rounded-[28px] border bg-white/88 p-5 shadow-[0_24px_80px_rgba(34,27,22,0.12)] backdrop-blur transition-shadow",
        isDragging ? "cursor-grabbing shadow-[0_30px_110px_rgba(34,27,22,0.2)]" : "cursor-grab",
        highlighted
          ? "border-[var(--accent-strong)] ring-2 ring-[var(--accent-soft)]"
          : "border-[var(--line-soft)]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={[
              "flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border text-lg font-semibold",
              highlighted
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
              {firstName} {lastName}
            </p>
            {note ? (
              <p className="mt-1 text-sm text-[var(--ink-soft)]">{note}</p>
            ) : null}
          </div>
        </div>
        {highlighted ? (
          <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-[var(--accent-strong)] uppercase">
            Root
          </span>
        ) : null}
      </div>
      {(onAddParent || onAddChild) ? (
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onAddParent}
            className="rounded-full border border-[var(--line-soft)] px-3 py-2 text-xs font-medium text-[var(--ink-soft)] transition hover:border-[var(--accent-strong)] hover:bg-[var(--accent-soft)]"
          >
            Add parent
          </button>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onAddChild}
            className="rounded-full border border-[var(--line-soft)] px-3 py-2 text-xs font-medium text-[var(--ink-soft)] transition hover:border-[var(--accent-strong)] hover:bg-[var(--accent-soft)]"
          >
            Add child
          </button>
        </div>
      ) : null}
    </article>
  );
}
