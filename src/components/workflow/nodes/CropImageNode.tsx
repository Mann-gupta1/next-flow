"use client";

import { memo } from "react";
import { type NodeProps, Position } from "@xyflow/react";
import { Crop } from "lucide-react";
import { NodeHandle, NodeShell } from "./NodeShell";
import { useWorkflowStore } from "@/store/workflow-store";
import type { CropImageData } from "@/lib/types";
import { cn } from "@/lib/utils";

function ParamSlider({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className={cn("space-y-1", disabled && "opacity-40")}>
      <div className="flex justify-between text-[10px] text-neutral-500 font-semibold">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full h-1 accent-black cursor-pointer"
      />
    </div>
  );
}

export const CropImageNode = memo(function CropImageNode({
  id,
  data,
  selected,
}: NodeProps) {
  const nodeData = data as CropImageData;
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const runningNodeIds = useWorkflowStore((s) => s.runningNodeIds);
  const edges = useWorkflowStore((s) => s.edges);
  const isRunning = runningNodeIds.includes(id) || nodeData.isRunning;

  const hasInputConnection = edges.some(
    (e) => e.target === id && e.targetHandle === "input-image"
  );

  return (
    <div className="relative">
      <NodeShell
        title={nodeData.label || "Crop Image"}
        icon={<Crop className="w-4 h-4" />}
        isRunning={isRunning}
      >
        <div className="space-y-3">
          <div className={cn(hasInputConnection && "opacity-40 pointer-events-none")}>
            <label className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wide">
              Input Image URL
            </label>
            <input
              type="text"
              value={nodeData.inputImage ?? ""}
              onChange={(e) => updateNodeData(id, { inputImage: e.target.value })}
              disabled={hasInputConnection || !!nodeData.isReadOnly}
              placeholder="Connect or enter URL..."
              className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded px-2 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-black"
            />
          </div>

          <ParamSlider
            label="Position X"
            value={nodeData.positionX ?? 0}
            onChange={(v) => updateNodeData(id, { positionX: v })}
            disabled={!!nodeData.isReadOnly || isRunning}
          />
          <ParamSlider
            label="Position Y"
            value={nodeData.positionY ?? 0}
            onChange={(v) => updateNodeData(id, { positionY: v })}
            disabled={!!nodeData.isReadOnly || isRunning}
          />
          <ParamSlider
            label="Width"
            value={nodeData.width ?? 100}
            onChange={(v) => updateNodeData(id, { width: v })}
            disabled={!!nodeData.isReadOnly || isRunning}
          />
          <ParamSlider
            label="Height"
            value={nodeData.height ?? 100}
            onChange={(v) => updateNodeData(id, { height: v })}
            disabled={!!nodeData.isReadOnly || isRunning}
          />

          {nodeData.outputImage && (
            <div className="rounded-lg overflow-hidden border border-neutral-200">
              <img
                src={nodeData.outputImage}
                alt="Cropped output"
                className="w-full h-20 object-cover"
              />
            </div>
          )}

          {nodeData.lastError && (
            <p className="text-[10px] text-red-600 font-medium">{nodeData.lastError}</p>
          )}
        </div>
      </NodeShell>

      <div className="absolute left-0 top-[35%]">
        <NodeHandle type="target" position={Position.Left} id="input-image" />
      </div>
      <div className="absolute right-0 top-[65%]">
        <NodeHandle type="source" position={Position.Right} id="output-image" />
      </div>
    </div>
  );
});
