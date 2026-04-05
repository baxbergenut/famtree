"use client";

import { useEffect, useMemo, useState } from "react";

import {
  createRelative,
  deletePerson,
  getCurrentSession,
  getTreeGraph,
  logout,
  updatePerson,
  updatePersonPosition,
  type SessionUser,
  type TreeGraph,
} from "@/lib/api";

import { type PersonDraft } from "@/components/workspace/types";

export function useWorkspaceData() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [graph, setGraph] = useState<TreeGraph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [draft, setDraft] = useState<PersonDraft | null>(null);
  const [pending, setPending] = useState(false);

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

  function openCreateDraft(personId: string, relation: "parent" | "child") {
    const person = findPerson(graph, personId);
    if (!person) {
      return;
    }

    setDraft({
      mode: "create",
      personId,
      relation,
      firstName: "",
      lastName: "",
      note: "",
      birthDate: "",
      isRoot: person.isRoot,
    });
    setError(null);
  }

  function openEditDraft(personId: string) {
    const person = findPerson(graph, personId);
    if (!person) {
      return;
    }

    setDraft({
      mode: "edit",
      personId,
      firstName: person.firstName,
      lastName: person.lastName,
      note: person.note ?? "",
      birthDate: person.birthDate ?? "",
      isRoot: person.isRoot,
    });
    setError(null);
  }

  function openDeleteDraft(personId: string) {
    const person = findPerson(graph, personId);
    if (!person) {
      return;
    }

    setDraft({
      mode: "delete",
      personId,
      firstName: person.firstName,
      lastName: person.lastName,
      note: person.note ?? "",
      birthDate: person.birthDate ?? "",
      isRoot: person.isRoot,
    });
    setError(null);
  }

  function updateDraft(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = event.target;
    setDraft((current) =>
      current && current.mode !== "delete"
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

  async function handleSubmitDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) {
      return;
    }

    setError(null);
    setPending(true);

    try {
      const updatedGraph =
        draft.mode === "create"
          ? await createRelative({
              anchorPersonId: draft.personId,
              relation: draft.relation,
              firstName: draft.firstName,
              lastName: draft.lastName,
              note: draft.note || undefined,
              birthDate: draft.birthDate || undefined,
            })
          : draft.mode === "edit"
            ? await updatePerson({
                personId: draft.personId,
                firstName: draft.firstName,
                lastName: draft.lastName,
                note: draft.note || undefined,
                birthDate: draft.birthDate || undefined,
              })
            : await deletePerson(draft.personId);

      setGraph(updatedGraph);
      setDraft(null);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save person changes.",
      );
    } finally {
      setPending(false);
    }
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
    openCreateDraft,
    openEditDraft,
    openDeleteDraft,
    updateDraft,
    closeDraft,
    handleLogout,
    handleSubmitDraft,
    movePersonLocally,
    persistPersonPosition,
  };
}

function findPerson(graph: TreeGraph | null, personId: string) {
  return graph?.persons.find((person) => person.id === personId) ?? null;
}

function formatName(firstName?: string, lastName?: string) {
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  return fullName || "You";
}
