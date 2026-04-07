import type { Edge, EdgeTypes, NodeTypes } from "@xyflow/react";

import {
  PERSON_NODE_HEIGHT,
  PERSON_NODE_WIDTH,
  PersonFlowNode,
  type PersonFlowData,
  type PersonFlowNodeType,
} from "@/components/workspace/person-flow-node";
import {
  UNION_NODE_HEIGHT,
  UNION_NODE_WIDTH,
  UnionFlowNode,
  type UnionFlowData,
  type UnionFlowNodeType,
} from "@/components/workspace/union-flow-node";
import { RelationshipEdge } from "@/components/workspace/relationship-edge";
import type { TreeGraph } from "@/lib/api";

type Point = {
  x: number;
  y: number;
};

export const workspaceNodeTypes = {
  person: PersonFlowNode,
  union: UnionFlowNode,
} satisfies NodeTypes;

export const workspaceEdgeTypes: EdgeTypes = {
  relationship: RelationshipEdge,
};

export function buildPersonNodes(
  graph: TreeGraph,
): PersonFlowNodeType[] {
  const nodes: PersonFlowNodeType[] = [];
  for (const person of graph.persons) {
    nodes.push({
      id: personNodeId(person.id),
      type: "person",
      position: {
        x: person.x - PERSON_NODE_WIDTH / 2,
        y: person.y - PERSON_NODE_HEIGHT / 2,
      },
      dragHandle: "[data-node-card='true']",
      data: {
        person,
      } satisfies PersonFlowData,
    } satisfies PersonFlowNodeType);
  }

  return nodes;
}

export function buildUnionNodes(
  graph: TreeGraph,
  personNodes: PersonFlowNodeType[],
): UnionFlowNodeType[] {
  const nodes: UnionFlowNodeType[] = [];
  const personCenters = getPersonCenters(personNodes);

  for (const unionNode of graph.unions) {
    const center = getUnionCenter(
      unionNode.parentIds,
      unionNode.childIds,
      personCenters,
    );
    nodes.push({
      id: unionNodeId(unionNode.id),
      type: "union",
      position: {
        x: center.x - UNION_NODE_WIDTH / 2,
        y: center.y - UNION_NODE_HEIGHT / 2,
      },
      draggable: false,
      selectable: false,
      focusable: false,
      data: {
        parentCount: unionNode.parentIds.length,
        childCount: unionNode.childIds.length,
      } satisfies UnionFlowData,
    } satisfies UnionFlowNodeType);
  }

  return nodes;
}

export function buildFlowEdges(graph: TreeGraph): Edge[] {
  const edges: Edge[] = [];

  for (const unionNode of graph.unions) {
    unionNode.parentIds.forEach((parentId, index) => {
      edges.push({
        id: `${personNodeId(parentId)}->${unionNodeId(unionNode.id)}:${index}`,
        source: personNodeId(parentId),
        target: unionNodeId(unionNode.id),
        sourceHandle: "person-source",
        targetHandle: `union-parent-${Math.min(index, 1)}`,
        type: "relationship",
        selectable: false,
      });
    });

    unionNode.childIds.forEach((childId) => {
      edges.push({
        id: `${unionNodeId(unionNode.id)}->${personNodeId(childId)}`,
        source: unionNodeId(unionNode.id),
        target: personNodeId(childId),
        sourceHandle: "union-children",
        targetHandle: "person-target",
        type: "relationship",
        selectable: false,
      });
    });
  }

  return edges;
}

export function personNodeId(personId: string) {
  return `person:${personId}`;
}

function unionNodeId(unionId: string) {
  return `union:${unionId}`;
}

function getPersonCenters(personNodes: PersonFlowNodeType[]) {
  const personCenters = new Map<string, Point>();

  for (const node of personNodes) {
    personCenters.set(node.data.person.id, {
      x: node.position.x + PERSON_NODE_WIDTH / 2,
      y: node.position.y + PERSON_NODE_HEIGHT / 2,
    });
  }

  return personCenters;
}

function getUnionCenter(
  parentIds: string[],
  childIds: string[],
  personCenters: Map<string, Point>,
): Point {
  const parents = parentIds
    .map((id) => personCenters.get(id))
    .filter((point): point is Point => Boolean(point));
  const children = childIds
    .map((id) => personCenters.get(id))
    .filter((point): point is Point => Boolean(point));

  if (parents.length === 0) {
    return { x: 0, y: 0 };
  }

  const averageParentX =
    parents.reduce((sum, point) => sum + point.x, 0) / parents.length;
  const parentBottom =
    Math.max(...parents.map((point) => point.y + PERSON_NODE_HEIGHT / 2)) + 20;

  if (children.length === 0) {
    return {
      x: averageParentX,
      y: parentBottom + 32,
    };
  }

  const highestChildTop = Math.min(
    ...children.map((point) => point.y - PERSON_NODE_HEIGHT / 2),
  );
  const midpointY = parentBottom + (highestChildTop - parentBottom) / 2;

  return {
    x: averageParentX,
    y: clamp(midpointY, parentBottom + 26, highestChildTop - 28),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
