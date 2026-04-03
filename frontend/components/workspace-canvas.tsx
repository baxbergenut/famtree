"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { PersonNodePreview } from "@/components/person-node-preview";
import {
  createRelative,
  getCurrentSession,
  getTreeGraph,
  logout,
  updatePersonPosition,
  type PersonNode,
  type SessionUser,
  type TreeGraph,
} from "@/lib/api";

const HEADER_HEIGHT = 84;
const SIDEBAR_WIDTH = 380;
const BUTTON_OFFSET = 24;
const NODE_HALF_HEIGHT = 78;
const PARTNER_CURVE_DEPTH = 56;
const SINGLE_PARENT_STUB = 48;
const CHILD_CURVE_OFFSET = 72;
const MIN_ZOOM = 0.55;
const MAX_ZOOM = 1.9;
const ZOOM_STEP = 0.0012;

type RelativeDraft = {
  anchorPersonId: string;
  relation: "parent" | "child";
  firstName: string;
  lastName: string;
  note: string;
  birthDate: string;
};

type InteractionState =
  | {
      type: "pan";
      startPointerX: number;
      startPointerY: number;
      startCameraX: number;
      startCameraY: number;
    }
  | {
      type: "node";
      personId: string;
      startPointerX: number;
      startPointerY: number;
      startNodeX: number;
      startNodeY: number;
    }
  | null;

const emptyDraft: RelativeDraft = {
  anchorPersonId: "",
  relation: "child",
  firstName: "",
  lastName: "",
  note: "",
  birthDate: "",
};

export function WorkspaceCanvas() {
  const interactionRef = useRef<InteractionState>(null);
  const graphRef = useRef<TreeGraph | null>(null);
  const zoomRef = useRef(1);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [graph, setGraph] = useState<TreeGraph | null>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [draft, setDraft] = useState<RelativeDraft | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    graphRef.current = graph;
  }, [graph]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [sessionUser, treeGraph] = await Promise.all([
          getCurrentSession(),
          getTreeGraph(),
        ]);

        if (!active) {
          return;
        }

        setUser(sessionUser);
        setGraph(treeGraph);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load your family tree.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const persons = useMemo(
    () => (Array.isArray(graph?.persons) ? graph.persons : []),
    [graph],
  );
  const familyUnits = useMemo(
    () => (Array.isArray(graph?.familyUnits) ? graph.familyUnits : []),
    [graph],
  );
  const personsById = useMemo(
    () => new Map(persons.map((person) => [person.id, person])),
    [persons],
  );
  const familyLinkCount = useMemo(
    () =>
      familyUnits.reduce(
        (total, familyUnit) => total + familyUnit.childPersonIds.length,
        0,
      ),
    [familyUnits],
  );
  const headerName = useMemo(
    () => formatName(user?.firstName, user?.lastName),
    [user?.firstName, user?.lastName],
  );

  function centerOnMe(
    targetGraph: TreeGraph | null,
    targetZoom = zoomRef.current,
  ) {
    if (!targetGraph || typeof window === "undefined") {
      return;
    }

    const me = targetGraph.persons.find(
      (person) => person.id === targetGraph.rootPersonId,
    );
    if (!me) {
      return;
    }

    const visibleWidth = window.innerWidth - SIDEBAR_WIDTH;
    const centerX = visibleWidth / 2;
    const centerY = HEADER_HEIGHT + (window.innerHeight - HEADER_HEIGHT) / 2;

    setCamera({
      x: centerX - me.x * targetZoom,
      y: centerY - me.y * targetZoom,
    });
  }

  const rootPersonId = graph?.rootPersonId;

  useEffect(() => {
    if (!rootPersonId) {
      return;
    }

    centerOnMe(graphRef.current, zoomRef.current);
  }, [rootPersonId]);

  useEffect(() => {
    function handleResize() {
      centerOnMe(graphRef.current, zoomRef.current);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const interaction = interactionRef.current;
      if (!interaction) {
        return;
      }

      if (interaction.type === "pan") {
        setCamera({
          x:
            interaction.startCameraX +
            (event.clientX - interaction.startPointerX),
          y:
            interaction.startCameraY +
            (event.clientY - interaction.startPointerY),
        });
        return;
      }

      const deltaX =
        (event.clientX - interaction.startPointerX) / zoomRef.current;
      const deltaY =
        (event.clientY - interaction.startPointerY) / zoomRef.current;

      setGraph((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          persons: current.persons.map((person) =>
            person.id === interaction.personId
              ? {
                  ...person,
                  x: interaction.startNodeX + deltaX,
                  y: interaction.startNodeY + deltaY,
                }
              : person,
          ),
        };
      });
    }

    function handlePointerUp() {
      const interaction = interactionRef.current;
      interactionRef.current = null;

      if (!interaction || interaction.type !== "node") {
        setDraggingNodeId(null);
        return;
      }

      const movedPerson = graphRef.current?.persons.find(
        (person) => person.id === interaction.personId,
      );
      setDraggingNodeId(null);

      if (!movedPerson) {
        return;
      }

      void updatePersonPosition(movedPerson.id, {
        x: movedPerson.x,
        y: movedPerson.y,
      }).catch((persistError) => {
        setError(
          persistError instanceof Error
            ? persistError.message
            : "Failed to save node position.",
        );
      });
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    setError(null);

    try {
      await logout();
      setUser(null);
      setGraph(null);
    } catch (logoutError) {
      setError(
        logoutError instanceof Error
          ? logoutError.message
          : "Failed to log out.",
      );
    } finally {
      setLoggingOut(false);
    }
  }

  function openDraft(anchorPersonId: string, relation: "parent" | "child") {
    setDraft({
      ...emptyDraft,
      anchorPersonId,
      relation,
    });
    setError(null);
  }

  function updateDraft(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;
    setDraft((current) =>
      current
        ? {
            ...current,
            [name]: value,
          }
        : current,
    );
  }

  function beginPan(event: React.PointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("[data-node-card='true']")) {
      return;
    }

    interactionRef.current = {
      type: "pan",
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startCameraX: camera.x,
      startCameraY: camera.y,
    };
  }

  function beginNodeDrag(
    person: PersonNode,
    event: React.PointerEvent<HTMLElement>,
  ) {
    event.preventDefault();
    event.stopPropagation();

    interactionRef.current = {
      type: "node",
      personId: person.id,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startNodeX: person.x,
      startNodeY: person.y,
    };
    setDraggingNodeId(person.id);
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    event.preventDefault();

    const element = canvasRef.current;
    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;

    const currentZoom = zoomRef.current;
    const nextZoom = clamp(
      currentZoom * (1 - event.deltaY * ZOOM_STEP),
      MIN_ZOOM,
      MAX_ZOOM,
    );

    if (Math.abs(nextZoom - currentZoom) < 0.001) {
      return;
    }

    const worldX = (pointerX - camera.x) / currentZoom;
    const worldY = (pointerY - camera.y) / currentZoom;

    setZoom(nextZoom);
    setCamera({
      x: pointerX - worldX * nextZoom,
      y: pointerY - worldY * nextZoom,
    });
  }

  function handleCreateRelative(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) {
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const updatedGraph = await createRelative({
          anchorPersonId: draft.anchorPersonId,
          relation: draft.relation,
          firstName: draft.firstName,
          lastName: draft.lastName,
          note: draft.note || undefined,
          birthDate: draft.birthDate || undefined,
        });

        setGraph(updatedGraph);
        setDraft(null);
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Failed to create relative.",
        );
      }
    });
  }

  if (loading) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-background text-sm text-(--ink-soft)">
        Loading your tree from PostgreSQL...
      </section>
    );
  }

  if (!user || !graph) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="w-full max-w-2xl rounded-4xl border border-(--line-soft) bg-white/80 p-8 shadow-[0_20px_80px_rgba(31,27,24,0.08)]">
          <h2 className="text-2xl font-semibold text-(--ink-strong)">
            Sign in to start building your tree
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-(--ink-soft)">
            The workspace needs an active session before it can load your family
            graph.
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/register"
              className="rounded-full bg-(--ink-strong) px-5 py-3 text-sm font-semibold text-white"
            >
              Register
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-(--line-strong) bg-(--surface-muted) px-5 py-3 text-sm font-semibold text-(--ink-strong)"
            >
              Log in
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const cameraCursor =
    interactionRef.current?.type === "pan" ? "cursor-grabbing" : "cursor-grab";

  return (
    <div className="fixed inset-0 overflow-hidden bg-background">
      <div
        ref={canvasRef}
        className={`absolute inset-0 select-none overflow-hidden ${cameraCursor}`}
        onPointerDown={beginPan}
        onWheel={handleWheel}
        style={{
          backgroundImage:
            "linear-gradient(rgba(145, 124, 103, 0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(145, 124, 103, 0.07) 1px, transparent 1px), radial-gradient(circle at center, rgba(255,255,255,0.92), rgba(244,235,224,0.88))",
          backgroundSize: `${48 * zoom}px ${48 * zoom}px, ${48 * zoom}px ${48 * zoom}px, 100% 100%`,
          backgroundPosition: `${camera.x}px ${camera.y}px, ${camera.x}px ${camera.y}px, center`,
        }}
      >
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          aria-hidden="true"
          style={{
            transform: `translate(${camera.x}px, ${camera.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {familyUnits.map((familyUnit) => {
            const parents = familyUnit.parentPersonIds
              .map((personId) => personsById.get(personId))
              .filter((person): person is PersonNode => Boolean(person))
              .sort((left, right) => left.x - right.x);
            const children = familyUnit.childPersonIds
              .map((personId) => personsById.get(personId))
              .filter((person): person is PersonNode => Boolean(person))
              .sort((left, right) => left.x - right.x);

            if (parents.length === 0) {
              return null;
            }

            const familyCurve = createFamilyCurve(parents);

            return (
              <g key={familyUnit.id}>
                <path
                  d={describeCubic(familyCurve)}
                  stroke="rgba(158, 111, 55, 0.5)"
                  strokeWidth={2.4 / zoom}
                  strokeLinecap="round"
                  fill="none"
                />
                {children.map((child, index) => {
                  const attachmentPoint = pointOnCubic(
                    familyCurve,
                    childAttachmentT(child, index, children.length, familyCurve),
                  );
                  const childTopY = child.y - NODE_HALF_HEIGHT;
                  const verticalLift = Math.min(
                    CHILD_CURVE_OFFSET,
                    Math.max(28, (childTopY - attachmentPoint.y) / 2),
                  );

                  return (
                    <path
                      key={`${familyUnit.id}-${child.id}-child`}
                      d={`M ${attachmentPoint.x} ${attachmentPoint.y} C ${attachmentPoint.x} ${attachmentPoint.y + verticalLift}, ${child.x} ${childTopY - verticalLift}, ${child.x} ${childTopY}`}
                      fill="none"
                      stroke="rgba(158, 111, 55, 0.42)"
                      strokeWidth={2.2 / zoom}
                      strokeLinecap="round"
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>

        <div
          className="absolute origin-top-left"
          style={{
            transform: `translate(${camera.x}px, ${camera.y}px) scale(${zoom})`,
          }}
        >
          {persons.map((person) => (
            <div
              key={person.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: person.x, top: person.y }}
            >
              <PersonNodePreview
                firstName={person.firstName}
                lastName={person.lastName}
                note={person.note}
                highlighted={person.isRoot}
                isDragging={draggingNodeId === person.id}
                onPointerDown={(event) => beginNodeDrag(person, event)}
                onAddParent={() => openDraft(person.id, "parent")}
                onAddChild={() => openDraft(person.id, "child")}
              />
            </div>
          ))}
        </div>
      </div>

      <header className="fixed left-0 right-0 top-0 z-30 flex h-21 items-center justify-between px-6 lg:px-8">
        <div className="flex items-center gap-3 rounded-full border border-(--line-soft) bg-white/84 px-4 py-3 shadow-[0_16px_48px_rgba(32,27,23,0.12)] backdrop-blur">
          <Link
            href="/"
            className="flex items-center gap-3 text-sm font-semibold tracking-[0.28em] text-(--ink-strong) uppercase"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-(--line-strong) bg-white text-base shadow-[0_8px_24px_rgba(36,31,28,0.08)]">
              F
            </span>
            famtree
          </Link>
          <span className="rounded-full bg-(--accent-soft) px-3 py-2 text-xs font-semibold tracking-[0.2em] text-(--accent-strong) uppercase">
            Canvas
          </span>
        </div>

        <div className="flex items-center gap-3 rounded-full border border-(--line-soft) bg-white/84 px-4 py-3 shadow-[0_16px_48px_rgba(32,27,23,0.12)] backdrop-blur">
          <div className="hidden text-right lg:block">
            <p className="text-sm font-semibold text-(--ink-strong)">
              {headerName}
            </p>
            <p className="text-xs text-(--ink-soft)">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-full border border-(--line-strong) bg-(--surface-muted) px-4 py-2 text-sm font-semibold text-(--ink-strong) transition hover:border-(--accent-strong) hover:bg-(--accent-soft) disabled:opacity-70"
          >
            {loggingOut ? "Logging out..." : "Log out"}
          </button>
        </div>
      </header>

      <aside className="fixed inset-y-0 right-0 z-30 w-95 border-l border-(--line-soft) bg-white/86 backdrop-blur-xl">
        <div className="h-full overflow-y-auto px-6 pb-6 pt-27">
          <p className="text-sm font-semibold tracking-[0.2em] text-(--accent-strong) uppercase">
            Add a relative
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-(--ink-strong)">
            {draft
              ? draft.relation === "parent"
                ? "Create a parent"
                : "Create a child"
              : "Choose a node"}
          </h2>
          <p className="mt-3 text-sm leading-7 text-(--ink-soft)">
            Drag the canvas with the mouse, zoom with the wheel, and drag nodes
            to place people where they make sense to you. Children connect to a
            shared family line instead of separate parent-to-child edges.
          </p>

          <div className="mt-6 rounded-3xl border border-(--line-soft) bg-(--surface-muted)/55 p-4 text-sm text-(--ink-soft)">
            <p>
              <span className="font-semibold text-(--ink-strong)">
                {persons.length}
              </span>{" "}
              people
            </p>
            <p className="mt-1">
              <span className="font-semibold text-(--ink-strong)">
                {familyUnits.length}
              </span>{" "}
              family units
            </p>
            <p className="mt-1">
              <span className="font-semibold text-(--ink-strong)">
                {familyLinkCount}
              </span>{" "}
              child links
            </p>
            <p className="mt-3">
              Zoom:{" "}
              <span className="font-semibold text-(--ink-strong)">
                {Math.round(zoom * 100)}%
              </span>
            </p>
          </div>

          {error ? (
            <section className="mt-5 rounded-3xl border border-[#d8b5a5] bg-[#fff1ec] p-4 text-sm text-[#8f4226]">
              {error}
            </section>
          ) : null}

          {draft ? (
            <form className="mt-6 space-y-4" onSubmit={handleCreateRelative}>
              <div className="grid gap-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-(--ink-strong)">
                    Name
                  </span>
                  <input
                    name="firstName"
                    value={draft.firstName}
                    onChange={updateDraft}
                    type="text"
                    className="w-full rounded-2xl border border-(--line-soft) bg-white px-4 py-3 text-sm text-(--ink-strong) outline-none transition focus:border-(--accent-strong)"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-(--ink-strong)">
                    Last name
                  </span>
                  <input
                    name="lastName"
                    value={draft.lastName}
                    onChange={updateDraft}
                    type="text"
                    placeholder="Optional"
                    className="w-full rounded-2xl border border-(--line-soft) bg-white px-4 py-3 text-sm text-(--ink-strong) outline-none transition focus:border-(--accent-strong)"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-(--ink-strong)">
                    Note
                  </span>
                  <input
                    name="note"
                    value={draft.note}
                    onChange={updateDraft}
                    type="text"
                    placeholder={
                      draft.relation === "parent"
                        ? "mom, dad, guardian..."
                        : "son, daughter, child..."
                    }
                    className="w-full rounded-2xl border border-(--line-soft) bg-white px-4 py-3 text-sm text-(--ink-strong) outline-none transition focus:border-(--accent-strong)"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-(--ink-strong)">
                    Birth date
                  </span>
                  <input
                    name="birthDate"
                    value={draft.birthDate}
                    onChange={updateDraft}
                    type="date"
                    className="w-full rounded-2xl border border-(--line-soft) bg-white px-4 py-3 text-sm text-(--ink-strong) outline-none transition focus:border-(--accent-strong)"
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-full bg-(--ink-strong) px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2c2520] disabled:opacity-70"
                >
                  {pending ? "Saving..." : "Save relative"}
                </button>
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  className="rounded-full border border-(--line-strong) bg-(--surface-muted) px-5 py-3 text-sm font-semibold text-(--ink-strong) transition hover:border-(--accent-strong) hover:bg-(--accent-soft)"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-(--line-strong) bg-(--surface-muted)/60 p-5 text-sm leading-7 text-(--ink-soft)">
              Start from your highlighted node in the middle, then add parents
              above or children below. Each child belongs to a shared family
              unit, so adding a second parent will join that same connector.
            </div>
          )}
        </div>
      </aside>

      <button
        type="button"
        onClick={() => centerOnMe(graph)}
        className="fixed bottom-6 left-6 z-30 rounded-full border border-(--line-soft) bg-white/88 px-5 py-3 text-sm font-semibold text-(--ink-strong) shadow-[0_16px_48px_rgba(32,27,23,0.12)] backdrop-blur transition hover:border-(--accent-strong) hover:bg-(--accent-soft)"
        style={{ bottom: BUTTON_OFFSET, left: BUTTON_OFFSET }}
      >
        Me
      </button>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

type Point = {
  x: number;
  y: number;
};

type CubicCurve = {
  start: Point;
  control1: Point;
  control2: Point;
  end: Point;
};

function createFamilyCurve(parents: PersonNode[]): CubicCurve {
  if (parents.length === 1) {
    const bottomY = parents[0].y + NODE_HALF_HEIGHT;

    return {
      start: { x: parents[0].x - SINGLE_PARENT_STUB, y: bottomY },
      control1: {
        x: parents[0].x - SINGLE_PARENT_STUB * 0.45,
        y: bottomY + PARTNER_CURVE_DEPTH * 0.55,
      },
      control2: {
        x: parents[0].x + SINGLE_PARENT_STUB * 0.45,
        y: bottomY + PARTNER_CURVE_DEPTH * 0.55,
      },
      end: { x: parents[0].x + SINGLE_PARENT_STUB, y: bottomY },
    };
  }

  const left = parents[0];
  const right = parents[parents.length - 1];
  const startY = left.y + NODE_HALF_HEIGHT;
  const endY = right.y + NODE_HALF_HEIGHT;
  const span = right.x - left.x;
  const depth = clamp(span * 0.18, 34, 88);
  const controlY = Math.max(startY, endY) + depth;
  const controlOffsetX = Math.max(span * 0.28, 42);

  return {
    start: { x: left.x, y: startY },
    control1: { x: left.x + controlOffsetX, y: controlY },
    control2: { x: right.x - controlOffsetX, y: controlY },
    end: { x: right.x, y: endY },
  };
}

function describeCubic(curve: CubicCurve) {
  return `M ${curve.start.x} ${curve.start.y} C ${curve.control1.x} ${curve.control1.y}, ${curve.control2.x} ${curve.control2.y}, ${curve.end.x} ${curve.end.y}`;
}

function pointOnCubic(curve: CubicCurve, t: number): Point {
  const oneMinusT = 1 - t;

  return {
    x:
      oneMinusT ** 3 * curve.start.x +
      3 * oneMinusT ** 2 * t * curve.control1.x +
      3 * oneMinusT * t ** 2 * curve.control2.x +
      t ** 3 * curve.end.x,
    y:
      oneMinusT ** 3 * curve.start.y +
      3 * oneMinusT ** 2 * t * curve.control1.y +
      3 * oneMinusT * t ** 2 * curve.control2.y +
      t ** 3 * curve.end.y,
  };
}

function childAttachmentT(
  child: PersonNode,
  index: number,
  totalChildren: number,
  curve: CubicCurve,
) {
  const span = curve.end.x - curve.start.x;
  if (Math.abs(span) < 1) {
    const spread = totalChildren <= 1 ? 0 : index / (totalChildren - 1) - 0.5;
    return clamp(0.5 + spread * 0.35, 0.18, 0.82);
  }

  const raw = (child.x - curve.start.x) / span;
  return clamp(raw, 0.08, 0.92);
}

function formatName(firstName?: string, lastName?: string) {
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  return fullName || "You";
}
