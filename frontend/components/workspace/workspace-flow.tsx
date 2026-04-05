"use client";

import {
  applyNodeChanges,
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type NodeChange,
  type OnNodeDrag,
  type OnNodesChange,
} from "@xyflow/react";
import { useEffect, useMemo, useRef, useState } from "react";

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
  onAddParent: (personId: string) => void;
  onAddChild: (personId: string) => void;
  onEditPerson: (personId: string) => void;
  onDeletePerson: (personId: string) => void;
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
  onEditPerson,
  onDeletePerson,
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
        onEditPerson,
        onDeletePerson,
      }),
    [graph, onAddChild, onAddParent, onDeletePerson, onEditPerson],
  );
  const baseNodes = useMemo(
    () => [...basePersonNodes, ...buildUnionNodes(graph, basePersonNodes)],
    [basePersonNodes, graph],
  );
  const [nodes, setNodes] = useState<Node[]>(baseNodes);

  useEffect(() => {
    setNodes(baseNodes);
  }, [baseNodes]);

  const edges = useMemo(() => buildFlowEdges(graph), [graph]);

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
    if (!changes.some(isPersonNodeChange)) {
      return;
    }

    setNodes((currentNodes) =>
      syncUnionNodePositions(graph, applyNodeChanges(changes, currentNodes)),
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
