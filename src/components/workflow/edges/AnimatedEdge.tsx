"use client";

import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";

export function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  selected,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: selected ? "#a855f7" : "#7c3aed",
          strokeWidth: selected ? 2.5 : 2,
        }}
      />
      <circle r="4" fill="#a855f7">
        <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
      </circle>
      <circle r="3" fill="#c084fc" opacity={0.6}>
        <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} begin="1s" />
      </circle>
    </>
  );
}
