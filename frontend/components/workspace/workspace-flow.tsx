"use client";

import {
  applyNodeChanges,
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeMouseHandler,
  type Node,
  type NodeChange,
  type OnNodeDrag,
  type OnNodesChange,
} from "@xyflow/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  buildFlowEdges,
  buildPersonNodes,
  buildUnionNodes,
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
  selectedPersonId: string | null;
  onSelectPerson: (personId: string | null) => void;
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
  selectedPersonId,
  onSelectPerson,
  onMovePerson,
  onPersistPerson,
}: WorkspaceFlowProps) {
  const { setCenter } = useReactFlow();
  const lastCenteredRootIdRef = useRef<string | null>(null);
  const rootPerson = useMemo(
    () => graph.persons.find((person) => person.id === graph.rootPersonId),
    [graph],
  );
  const basePersonNodes = useMemo(() => buildPersonNodes(graph), [graph]);
  const baseNodes = useMemo(
    () => [...basePersonNodes, ...buildUnionNodes(graph, basePersonNodes)],
    [basePersonNodes, graph],
  );
  const [nodes, setNodes] = useState<Node[]>(baseNodes);

  useEffect(() => {
    setNodes(
      baseNodes.map((node) =>
        node.id.startsWith("person:")
          ? { ...node, selected: node.id === personNodeId(selectedPersonId) }
          : node,
      ),
    );
  }, [baseNodes, selectedPersonId]);

  const edges = useMemo(() => buildFlowEdges(graph), [graph]);

  const centerRoot = useCallback(
    (duration = 280) => {
      if (!rootPerson) {
        return;
      }

      const xOffset = typeof window === "undefined" ? 0 : SIDEBAR_WIDTH / 2;
      const yOffset = typeof window === "undefined" ? 0 : HEADER_HEIGHT / 2;

      void setCenter(rootPerson.x + xOffset, rootPerson.y - yOffset, {
        zoom: 1,
        duration,
      });
    },
    [rootPerson, setCenter],
  );

  useEffect(() => {
    if (lastCenteredRootIdRef.current === graph.rootPersonId) {
      return;
    }

    if (!rootPerson) {
      return;
    }

    // Keep initial viewport anchored on the root person.
    centerRoot();
    lastCenteredRootIdRef.current = graph.rootPersonId;
  }, [centerRoot, graph.rootPersonId, rootPerson]);

  const handleNodesChange: OnNodesChange = (changes) => {
    if (!changes.some(isPersonNodeChange)) {
      return;
    }

    setNodes((currentNodes) =>
      syncUnionNodePositions(graph, applyNodeChanges(changes, currentNodes)),
    );
  };

  const handleNodeClick: NodeMouseHandler<Node> = (_, node) => {
    if (!node.id.startsWith("person:")) {
      return;
    }

    onSelectPerson(node.id.replace("person:", ""));
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
        onNodeClick={handleNodeClick}
        onPaneClick={() => onSelectPerson(null)}
        proOptions={{ hideAttribution: true }}
        className="workspace-flow"
      >
        <Background
          gap={48}
          size={1.1}
          variant={BackgroundVariant.Lines}
          color="rgba(255, 255, 255, 0.08)"
        />
      </ReactFlow>
      <div className="pointer-events-none absolute bottom-6 left-6 z-20">
        <button
          type="button"
          onClick={() => centerRoot(220)}
          className="pointer-events-auto rounded-full border border-[var(--line-strong)] bg-[rgba(10,15,25,0.86)] px-4 py-2 text-sm font-medium text-[var(--ink-soft)] shadow-[0_12px_40px_rgba(0,0,0,0.28)] transition hover:border-[var(--accent-strong)] hover:text-[var(--ink-strong)]"
        >
          Center root
        </button>
      </div>
    </div>
  );
}

function personNodeId(personId: string | null) {
  return personId ? `person:${personId}` : "";
}

function isPersonNodeChange(
  change: NodeChange,
): change is NodeChange<PersonFlowNodeType> {
  return "id" in change && change.id.startsWith("person:");
}

function syncUnionNodePositions(graph: TreeGraph, nodes: Node[]) {
  const personNodes = nodes.filter(isPersonFlowNode);
  const nextUnionNodes = buildUnionNodes(graph, personNodes);
  const nextUnionNodeById = new Map(
    nextUnionNodes.map((unionNode) => [unionNode.id, unionNode]),
  );
  const syncedNodes = nodes.map((node) => {
    if (node.type !== "union") {
      return node;
    }

    const nextUnionNode = nextUnionNodeById.get(node.id);
    if (!nextUnionNode) {
      return node;
    }

    return {
      ...node,
      position: nextUnionNode.position,
      data: nextUnionNode.data,
    };
  });
  const existingNodeIds = new Set(syncedNodes.map((node) => node.id));

  return [
    ...syncedNodes,
    ...nextUnionNodes.filter((unionNode) => !existingNodeIds.has(unionNode.id)),
  ];
}

function isPersonFlowNode(node: Node): node is PersonFlowNodeType {
  return node.type === "person";
}
