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
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  return (
    <article
      onPointerDown={onPointerDown}
      data-node-card="true"
      className={[
        compact ? "w-60" : "w-64",
        "relative isolate select-none overflow-visible rounded-[28px] border bg-[rgba(28,36,56,0.96)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.36)] backdrop-blur transition-shadow",
        isDragging
          ? "cursor-grabbing shadow-[0_30px_110px_rgba(0,0,0,0.38)]"
          : "cursor-grab",
        highlighted
          ? "border-[rgba(140,190,255,0.78)] shadow-[0_0_0_1px_rgba(140,190,255,0.4),0_0_36px_rgba(88,153,255,0.58),0_0_84px_rgba(70,126,255,0.46),0_32px_110px_rgba(18,36,86,0.52)]"
          : "border-[rgba(255,255,255,0.18)]",
      ].join(" ")}
    >
      {highlighted ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-7 -z-10 rounded-[40px] bg-[radial-gradient(circle,rgba(98,168,255,0.68)_0%,rgba(72,136,255,0.4)_42%,rgba(35,76,184,0.12)_74%,rgba(14,26,68,0)_100%)] blur-2xl"
        />
      ) : null}

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={[
              "flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border text-lg font-semibold",
              highlighted
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
            {note ? (
              <p className="mt-1 text-sm text-[var(--ink-soft)]">{note}</p>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
