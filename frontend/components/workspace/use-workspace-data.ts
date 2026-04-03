"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import {
  createRelative,
  getCurrentSession,
  getTreeGraph,
  logout,
  updatePersonPosition,
  type SessionUser,
  type TreeGraph,
} from "@/lib/api";

import { emptyDraft, type RelativeDraft } from "@/components/workspace/types";

export function useWorkspaceData() {
  const graphRef = useRef<TreeGraph | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [graph, setGraph] = useState<TreeGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [draft, setDraft] = useState<RelativeDraft | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    graphRef.current = graph;
  }, [graph]);

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

  const headerName = useMemo(
    () => formatName(user?.firstName, user?.lastName),
    [user?.firstName, user?.lastName],
  );

  const unionChildLinkCount = useMemo(
    () =>
      (graph?.unions ?? []).reduce(
        (total, unionNode) => total + unionNode.childIds.length,
        0,
      ),
    [graph?.unions],
  );

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

  function closeDraft() {
    setDraft(null);
  }

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

  function movePersonLocally(personId: string, position: { x: number; y: number }) {
    setGraph((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        persons: current.persons.map((person) =>
          person.id === personId
            ? {
                ...person,
                x: position.x,
                y: position.y,
              }
            : person,
        ),
      };
    });
  }

  async function persistPersonPosition(personId: string, position: { x: number; y: number }) {
    try {
      await updatePersonPosition(personId, position);
    } catch (persistError) {
      setError(
        persistError instanceof Error
          ? persistError.message
          : "Failed to save node position.",
      );
    }
  }

  return {
    user,
    graph,
    error,
    loading,
    loggingOut,
    draft,
    pending,
    headerName,
    unionChildLinkCount,
    openDraft,
    updateDraft,
    closeDraft,
    handleLogout,
    handleCreateRelative,
    movePersonLocally,
    persistPersonPosition,
  };
}

function formatName(firstName?: string, lastName?: string) {
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  return fullName || "You";
}
