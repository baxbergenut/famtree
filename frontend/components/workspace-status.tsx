"use client";

import { useEffect, useState } from "react";

import {
  getCurrentSession,
  getCurrentTree,
  logout,
  type SessionUser,
  type TreeSummary,
} from "@/lib/api";

export function WorkspaceStatus() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [tree, setTree] = useState<TreeSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [sessionUser, currentTree] = await Promise.all([
          getCurrentSession(),
          getCurrentTree(),
        ]);

        if (!active) {
          return;
        }

        setUser(sessionUser);
        setTree(currentTree);
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load your workspace.",
        );
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    setError(null);

    try {
      await logout();
      setUser(null);
      setTree(null);
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

  if (error) {
    return (
      <section className="rounded-[28px] border border-[#d8b5a5] bg-[#fff1ec] p-5 text-sm text-[#8f4226]">
        {error}
      </section>
    );
  }

  if (!user || !tree) {
    return (
      <section className="rounded-[28px] border border-[var(--line-soft)] bg-white/72 p-5 text-sm text-[var(--ink-soft)] shadow-[0_18px_50px_rgba(31,27,24,0.08)]">
        No active session yet. Register or log in to see your database-backed root person here.
      </section>
    );
  }

  return (
    <section className="rounded-[30px] border border-[var(--line-soft)] bg-white/78 p-6 shadow-[0_24px_80px_rgba(31,27,24,0.08)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-[var(--accent-strong)] uppercase">
            Active session
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-[var(--ink-strong)]">
            {tree.rootPerson.firstName} {tree.rootPerson.lastName}
          </h2>
          <p className="mt-2 text-sm leading-7 text-[var(--ink-soft)]">
            Signed in as {user.email}. Your root person was loaded from PostgreSQL with coordinates ({tree.rootPerson.x}, {tree.rootPerson.y}).
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="rounded-full border border-[var(--line-strong)] bg-[var(--surface-muted)] px-5 py-3 text-sm font-semibold text-[var(--ink-strong)] transition hover:border-[var(--accent-strong)] hover:bg-[var(--accent-soft)]"
        >
          {loggingOut ? "Logging out..." : "Log out"}
        </button>
      </div>
    </section>
  );
}
