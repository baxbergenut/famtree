"use client";

import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";

export function RelationshipEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgeProps) {
  const [path] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.42,
  });

  return (
    <BaseEdge
      path={path}
      style={{
        stroke: "rgba(208, 160, 96, 0.42)",
        strokeWidth: 2.2,
        strokeLinecap: "round",
      }}
    />
  );
}
