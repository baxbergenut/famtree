"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

export const UNION_NODE_WIDTH = 72;
export const UNION_NODE_HEIGHT = 22;

export type UnionFlowData = {
  parentCount: number;
  childCount: number;
};

export type UnionFlowNodeType = Node<UnionFlowData, "union">;

export function UnionFlowNode({ data }: NodeProps<UnionFlowNodeType>) {
  const handlePositions = data.parentCount <= 1 ? ["50%"] : ["22%", "78%"];

  return (
    <div className="pointer-events-none relative h-[22px] w-[72px]">
      {handlePositions.map((left, index) => (
        <Handle
          key={`union-parent-${index}`}
          id={`union-parent-${index}`}
          type="target"
          position={Position.Top}
          style={{ left }}
          className="!h-2.5 !w-2.5 !border-0 !bg-transparent"
        />
      ))}
      <Handle
        id="union-children"
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !border-0 !bg-transparent"
      />
      <div className="absolute left-1/2 top-1/2 h-[10px] w-[56px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(208,160,96,0.2)] bg-[linear-gradient(180deg,rgba(208,160,96,0.24),rgba(208,160,96,0.1))] shadow-[0_10px_28px_rgba(0,0,0,0.18)]" />
      {data.childCount > 0 ? (
        <div className="absolute left-1/2 top-1/2 h-[4px] w-[4px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgba(208,160,96,0.46)]" />
      ) : null}
    </div>
  );
}
