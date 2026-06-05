"use client";

import { memo } from "react";
import { type NodeProps, Position } from "@xyflow/react";
import { CheckCircle2 } from "lucide-react";
import { NodeHandle, NodeShell } from "./NodeShell";
import type { ResponseData } from "@/lib/types";

export const ResponseNode = memo(function ResponseNode({ data }: NodeProps) {
  const nodeData = data as ResponseData;

  return (
    <div className="relative">
      <NodeShell
        title={nodeData.label || "Response"}
        icon={<CheckCircle2 className="w-4 h-4" />}
      >
        <div className="space-y-2">
          <label className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wide">
            Final Result
          </label>
          {nodeData.result ? (
            <div className="rounded-lg bg-emerald-50/50 border border-emerald-200 p-3">
              <p className="text-xs text-neutral-800 whitespace-pre-wrap max-h-48 overflow-y-auto">
                {nodeData.result}
              </p>
            </div>
          ) : (
            <p className="text-xs text-neutral-400 italic">
              Connect a node output to result
            </p>
          )}
        </div>
      </NodeShell>

      <div className="absolute left-0 top-[50%]">
        <NodeHandle type="target" position={Position.Left} id="result" />
      </div>
    </div>
  );
});
