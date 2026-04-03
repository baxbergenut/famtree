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
  const relationships = useMemo(
    () => (Array.isArray(graph?.relationships) ? graph.relationships : []),
    [graph],
  );
  const personsById = useMemo(
    () => new Map(persons.map((person) => [person.id, person])),
    [persons],
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

  useEffect(() => {
    if (!graph) {
      return;
    }

    centerOnMe(graph, zoomRef.current);
  }, [graph?.rootPersonId]);

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
      <section className="flex min-h-screen items-center justify-center bg-[var(--background)] text-sm text-[var(--ink-soft)]">
        Loading your tree from PostgreSQL...
      </section>
    );
  }

  if (!user || !graph) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-[var(--background)] px-6">
        <div className="w-full max-w-2xl rounded-[32px] border border-[var(--line-soft)] bg-white/80 p-8 shadow-[0_20px_80px_rgba(31,27,24,0.08)]">
          <h2 className="text-2xl font-semibold text-[var(--ink-strong)]">
            Sign in to start building your tree
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--ink-soft)]">
            The workspace needs an active session before it can load your family
            graph.
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/register"
              className="rounded-full bg-[var(--ink-strong)] px-5 py-3 text-sm font-semibold text-white"
            >
              Register
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-[var(--line-strong)] bg-[var(--surface-muted)] px-5 py-3 text-sm font-semibold text-[var(--ink-strong)]"
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
    <div className="fixed inset-0 overflow-hidden bg-[var(--background)]">
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
          {relationships.map((relationship) => {
            const parent = personsById.get(relationship.parentPersonId);
            const child = personsById.get(relationship.childPersonId);
            if (!parent || !child) return null;

            const parentX = parent.x;
            const parentY = parent.y + NODE_HALF_HEIGHT;
            const childX = child.x;
            const childY = child.y - NODE_HALF_HEIGHT;
            const midpointY = (parentY + childY) / 2;

            return (
              <path
                key={relationship.id}
                d={`M ${parentX} ${parentY} C ${parentX} ${midpointY}, ${childX} ${midpointY}, ${childX} ${childY}`}
                fill="none"
                stroke="rgba(158, 111, 55, 0.45)"
                strokeWidth={2.2 / zoom} // keep stroke visually consistent
                strokeLinecap="round"
              />
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

      <header className="fixed left-0 right-0 top-0 z-30 flex h-[84px] items-center justify-between px-6 lg:px-8">
        <div className="flex items-center gap-3 rounded-full border border-[var(--line-soft)] bg-white/84 px-4 py-3 shadow-[0_16px_48px_rgba(32,27,23,0.12)] backdrop-blur">
          <Link
            href="/"
            className="flex items-center gap-3 text-sm font-semibold tracking-[0.28em] text-[var(--ink-strong)] uppercase"
          >
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line-strong)] bg-white text-base shadow-[0_8px_24px_rgba(36,31,28,0.08)]">
              F
            </span>
            famtree
          </Link>
          <span className="rounded-full bg-[var(--accent-soft)] px-3 py-2 text-xs font-semibold tracking-[0.2em] text-[var(--accent-strong)] uppercase">
            Canvas
          </span>
        </div>

        <div className="flex items-center gap-3 rounded-full border border-[var(--line-soft)] bg-white/84 px-4 py-3 shadow-[0_16px_48px_rgba(32,27,23,0.12)] backdrop-blur">
          <div className="hidden text-right lg:block">
            <p className="text-sm font-semibold text-[var(--ink-strong)]">
              {headerName}
            </p>
            <p className="text-xs text-[var(--ink-soft)]">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-full border border-[var(--line-strong)] bg-[var(--surface-muted)] px-4 py-2 text-sm font-semibold text-[var(--ink-strong)] transition hover:border-[var(--accent-strong)] hover:bg-[var(--accent-soft)] disabled:opacity-70"
          >
            {loggingOut ? "Logging out..." : "Log out"}
          </button>
        </div>
      </header>

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
            Drag the canvas with the mouse, zoom with the wheel, and drag nodes
            to place people where they make sense to you.
          </p>

          <div className="mt-6 rounded-[24px] border border-[var(--line-soft)] bg-[var(--surface-muted)]/55 p-4 text-sm text-[var(--ink-soft)]">
            <p>
              <span className="font-semibold text-[var(--ink-strong)]">
                {persons.length}
              </span>{" "}
              people
            </p>
            <p className="mt-1">
              <span className="font-semibold text-[var(--ink-strong)]">
                {relationships.length}
              </span>{" "}
              parent-child connections
            </p>
            <p className="mt-3">
              Zoom:{" "}
              <span className="font-semibold text-[var(--ink-strong)]">
                {Math.round(zoom * 100)}%
              </span>
            </p>
          </div>

          {error ? (
            <section className="mt-5 rounded-[24px] border border-[#d8b5a5] bg-[#fff1ec] p-4 text-sm text-[#8f4226]">
              {error}
            </section>
          ) : null}

          {draft ? (
            <form className="mt-6 space-y-4" onSubmit={handleCreateRelative}>
              <div className="grid gap-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-[var(--ink-strong)]">
                    Name
                  </span>
                  <input
                    name="firstName"
                    value={draft.firstName}
                    onChange={updateDraft}
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
                    onChange={updateDraft}
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
                    onChange={updateDraft}
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
                    onChange={updateDraft}
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
                  onClick={() => setDraft(null)}
                  className="rounded-full border border-[var(--line-strong)] bg-[var(--surface-muted)] px-5 py-3 text-sm font-semibold text-[var(--ink-strong)] transition hover:border-[var(--accent-strong)] hover:bg-[var(--accent-soft)]"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-6 rounded-[24px] border border-dashed border-[var(--line-strong)] bg-[var(--surface-muted)]/60 p-5 text-sm leading-7 text-[var(--ink-soft)]">
              Start from your highlighted node in the middle, then add parents
              above or children below. Last name is optional.
            </div>
          )}
        </div>
      </aside>

      <button
        type="button"
        onClick={() => centerOnMe(graph)}
        className="fixed bottom-6 left-6 z-30 rounded-full border border-[var(--line-soft)] bg-white/88 px-5 py-3 text-sm font-semibold text-[var(--ink-strong)] shadow-[0_16px_48px_rgba(32,27,23,0.12)] backdrop-blur transition hover:border-[var(--accent-strong)] hover:bg-[var(--accent-soft)]"
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

function formatName(firstName?: string, lastName?: string) {
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  return fullName || "You";
}
