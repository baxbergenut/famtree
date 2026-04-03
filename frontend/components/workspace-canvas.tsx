"use client";

import Link from "next/link";

import { WorkspaceFlow } from "@/components/workspace/workspace-flow";
import { WorkspaceHeader } from "@/components/workspace/workspace-header";
import { WorkspaceSidebar } from "@/components/workspace/workspace-sidebar";
import { useWorkspaceData } from "@/components/workspace/use-workspace-data";

export function WorkspaceCanvas() {
  const {
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
  } = useWorkspaceData();

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

  return (
    <div className="fixed inset-0 overflow-hidden bg-[var(--background)]">
      <div className="absolute inset-0">
        <WorkspaceFlow
          graph={graph}
          onAddParent={(personId) => openDraft(personId, "parent")}
          onAddChild={(personId) => openDraft(personId, "child")}
          onMovePerson={movePersonLocally}
          onPersistPerson={persistPersonPosition}
        />
      </div>

      <WorkspaceHeader
        headerName={headerName}
        email={user.email}
        loggingOut={loggingOut}
        onLogout={handleLogout}
      />

      <WorkspaceSidebar
        graph={graph}
        draft={draft}
        pending={pending}
        error={error}
        unionChildLinkCount={unionChildLinkCount}
        onDraftChange={updateDraft}
        onSubmit={handleCreateRelative}
        onCancel={closeDraft}
      />
    </div>
  );
}
