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
    selectedPerson,
    selectedPersonId,
    pending,
    headerName,
    unionChildLinkCount,
    openCreateDraft,
    openEditDraft,
    openDeleteDraft,
    updateDraft,
    closeDraft,
    selectPerson,
    handleLogout,
    handleSubmitDraft,
    movePersonLocally,
    persistPersonPosition,
  } = useWorkspaceData();

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
        <div className="w-full max-w-2xl rounded-4xl border border-(--line-soft) bg-[rgba(10,15,25,0.84)] p-8 shadow-[0_20px_80px_rgba(0,0,0,0.26)]">
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
              className="rounded-full bg-(--ink-strong) px-5 py-3 text-sm font-semibold text-[#07101d]"
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

  return (
    <div className="fixed inset-0 overflow-hidden bg-background">
      <div className="absolute inset-0">
        <WorkspaceFlow
          graph={graph}
          selectedPersonId={selectedPersonId}
          onSelectPerson={selectPerson}
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
        selectedPerson={selectedPerson}
        draft={draft}
        pending={pending}
        error={error}
        unionChildLinkCount={unionChildLinkCount}
        onAddParent={() =>
          selectedPerson && openCreateDraft(selectedPerson.id, "parent")
        }
        onAddChild={() =>
          selectedPerson && openCreateDraft(selectedPerson.id, "child")
        }
        onEditPerson={() => selectedPerson && openEditDraft(selectedPerson.id)}
        onDeletePerson={() =>
          selectedPerson && openDeleteDraft(selectedPerson.id)
        }
        onDraftChange={updateDraft}
        onSubmit={handleSubmitDraft}
        onCancel={closeDraft}
      />
    </div>
  );
}
