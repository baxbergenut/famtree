import { PersonNodePreview } from "@/components/person-node-preview";

const people = [
  {
    id: "p1",
    firstName: "Avery",
    lastName: "Rivera",
    note: "you",
    highlighted: true,
    position: "left-[50%] top-[52%] -translate-x-1/2 -translate-y-1/2",
  },
  {
    id: "p2",
    firstName: "Elena",
    lastName: "Rivera",
    note: "mother",
    position: "left-[33%] top-[22%] -translate-x-1/2",
  },
  {
    id: "p3",
    firstName: "Thomas",
    lastName: "Rivera",
    note: "father",
    position: "left-[67%] top-[22%] -translate-x-1/2",
  },
  {
    id: "p4",
    firstName: "Mila",
    lastName: "Rivera",
    note: "daughter",
    position: "left-[50%] top-[78%] -translate-x-1/2 -translate-y-full",
  },
];

export function CanvasPreview() {
  return (
    <section className="relative overflow-hidden rounded-[36px] border border-[var(--line-soft)] bg-[var(--surface-panel)] p-5 shadow-[0_32px_100px_rgba(28,24,21,0.12)]">
      <div className="canvas-surface relative h-[620px] overflow-hidden rounded-[28px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.76),_transparent_40%),linear-gradient(180deg,_rgba(255,255,255,0.3),_rgba(255,255,255,0))]" />
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <path
            d="M 33 35 C 41 49, 59 49, 67 35"
            fill="none"
            stroke="rgba(180,145,98,0.58)"
            strokeWidth="0.55"
            strokeLinecap="round"
          />
          <path
            d="M 50 45 C 50 57, 50 60, 50 69"
            fill="none"
            stroke="rgba(180,145,98,0.42)"
            strokeWidth="0.45"
            strokeLinecap="round"
          />
        </svg>

        {people.map((person) => (
          <div key={person.id} className={`absolute ${person.position}`}>
            <PersonNodePreview
              firstName={person.firstName}
              lastName={person.lastName}
              note={person.note}
              highlighted={person.highlighted}
            />
          </div>
        ))}

        <div className="absolute left-6 top-6 rounded-full border border-[var(--line-soft)] bg-white/80 px-4 py-2 text-xs font-medium text-[var(--ink-soft)] shadow-[0_12px_40px_rgba(31,27,24,0.12)] backdrop-blur">
          Union-node preview
        </div>
        <div className="absolute bottom-6 right-6 flex gap-2 rounded-full border border-[var(--line-soft)] bg-white/80 p-2 shadow-[0_12px_40px_rgba(31,27,24,0.12)] backdrop-blur">
          <button type="button" className="rounded-full bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--ink-soft)]">
            -
          </button>
          <button type="button" className="rounded-full bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--ink-soft)]">
            +
          </button>
          <button type="button" className="rounded-full bg-[var(--surface-muted)] px-4 py-2 text-sm text-[var(--ink-soft)]">
            Center root
          </button>
        </div>
      </div>
    </section>
  );
}
