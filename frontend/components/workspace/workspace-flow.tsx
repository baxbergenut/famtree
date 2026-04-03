"use client";

import {
  applyNodeChanges,
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type OnNodeDrag,
  type OnNodesChange,
} from "@xyflow/react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  buildFlowGraph,
  buildPersonNodes,
  workspaceEdgeTypes,
  workspaceNodeTypes,
} from "@/components/workspace/graph-builder";
import {
  PERSON_NODE_HEIGHT,
  PERSON_NODE_WIDTH,
  type PersonFlowNodeType,
} from "@/components/workspace/person-flow-node";
import type { TreeGraph } from "@/lib/api";

const SIDEBAR_WIDTH = 380;
const HEADER_HEIGHT = 84;

type WorkspaceFlowProps = {
  graph: TreeGraph;
  onAddParent: (personId: string) => void;
  onAddChild: (personId: string) => void;
  onMovePerson: (personId: string, position: { x: number; y: number }) => void;
  onPersistPerson: (
    personId: string,
    position: { x: number; y: number },
  ) => Promise<void>;
};

export function WorkspaceFlow(props: WorkspaceFlowProps) {
  return (
    <ReactFlowProvider>
      <WorkspaceFlowInner {...props} />
    </ReactFlowProvider>
  );
}

function WorkspaceFlowInner({
  graph,
  onAddParent,
  onAddChild,
  onMovePerson,
  onPersistPerson,
}: WorkspaceFlowProps) {
  const { setCenter } = useReactFlow();
  const lastCenteredRootIdRef = useRef<string | null>(null);
  const basePersonNodes = useMemo(
    () =>
      buildPersonNodes(graph, {
        onAddParent,
        onAddChild,
      }),
    [graph, onAddChild, onAddParent],
  );
  const [personNodes, setPersonNodes] =
    useState<PersonFlowNodeType[]>(basePersonNodes);

  useEffect(() => {
    setPersonNodes(basePersonNodes);
  }, [basePersonNodes]);

  const { nodes, edges } = useMemo(
    () => buildFlowGraph(graph, personNodes),
    [graph, personNodes],
  );

  useEffect(() => {
    if (lastCenteredRootIdRef.current === graph.rootPersonId) {
      return;
    }

    const rootPerson = graph.persons.find(
      (person) => person.id === graph.rootPersonId,
    );
    if (!rootPerson) {
      return;
    }

    const xOffset = typeof window === "undefined" ? 0 : SIDEBAR_WIDTH / 2;
    const yOffset = typeof window === "undefined" ? 0 : HEADER_HEIGHT / 2;

    // React Flow centers the provided world coordinate in the full viewport.
    // The sidebar occupies the right side, so we bias the viewport center to the
    // right to keep the root centered in the remaining visible canvas area.
    void setCenter(rootPerson.x + xOffset, rootPerson.y - yOffset, {
      zoom: 1,
      duration: 280,
    });
    lastCenteredRootIdRef.current = graph.rootPersonId;
  }, [graph, setCenter]);

  const handleNodesChange: OnNodesChange = (changes) => {
    setPersonNodes((currentNodes) =>
      applyNodeChanges(
        changes as Parameters<typeof applyNodeChanges<PersonFlowNodeType>>[0],
        currentNodes,
      ),
    );
  };

  const handleNodeDragStop: OnNodeDrag = async (_, node) => {
    if (!node.id.startsWith("person:")) {
      return;
    }

    const personId = node.id.replace("person:", "");
    const position = {
      x: node.position.x + PERSON_NODE_WIDTH / 2,
      y: node.position.y + PERSON_NODE_HEIGHT / 2,
    };

    onMovePerson(personId, position);
    await onPersistPerson(personId, position);
  };

  return (
    <div className="absolute inset-0 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={workspaceNodeTypes}
        edgeTypes={workspaceEdgeTypes}
        defaultEdgeOptions={{ type: "relationship" }}
        nodesDraggable
        fitView={false}
        minZoom={0.45}
        maxZoom={1.8}
        onNodesChange={handleNodesChange}
        onNodeDragStop={handleNodeDragStop}
        proOptions={{ hideAttribution: true }}
        className="workspace-flow"
      >
        <Background
          gap={48}
          size={1.1}
          variant={BackgroundVariant.Lines}
          color="rgba(145, 124, 103, 0.2)"
        />
      </ReactFlow>
    </div>
  );
}
