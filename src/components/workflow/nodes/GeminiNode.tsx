"use client";

import { memo, useState } from "react";
import { type NodeProps, Position } from "@xyflow/react";
import { Bot, ChevronDown, ChevronUp } from "lucide-react";
import { NodeHandle, NodeShell } from "./NodeShell";
import { useWorkflowStore } from "@/store/workflow-store";
import type { GeminiData } from "@/lib/types";
import { GEMINI_MODELS, DEFAULT_GEMINI_MODEL } from "@/lib/types";
import { cn } from "@/lib/utils";

export const GeminiNode = memo(function GeminiNode({ id, data }: NodeProps) {
  const nodeData = data as GeminiData;
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const runningNodeIds = useWorkflowStore((s) => s.runningNodeIds);
  const edges = useWorkflowStore((s) => s.edges);
  const [settingsOpen, setSettingsOpen] = useState(nodeData.settingsOpen ?? false);
  const isRunning = runningNodeIds.includes(id) || nodeData.isRunning;

  const promptConnected = edges.some(
    (e) => e.target === id && e.targetHandle === "prompt"
  );
  const systemConnected = edges.some(
    (e) => e.target === id && e.targetHandle === "systemPrompt"
  );
  const imageConnected = edges.some(
    (e) => e.target === id && e.targetHandle === "image"
  );
  const audioConnected = edges.some(
    (e) => e.target === id && e.targetHandle === "audio"
  );
  const fileConnected = edges.some(
    (e) => e.target === id && e.targetHandle === "file"
  );

  return (
    <div className="relative">
      <NodeShell
        title={nodeData.label || "Gemini 3.1 Pro"}
        icon={<Bot className="w-4 h-4" />}
        isRunning={isRunning}
        className="min-w-[320px]"
      >
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wide">
              Model
            </label>
            <select
              value={nodeData.model ?? DEFAULT_GEMINI_MODEL}
              onChange={(e) => updateNodeData(id, { model: e.target.value })}
              className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded px-2 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-black"
            >
              {GEMINI_MODELS.map((m) => (
                <option key={m.id} value={m.id} className="bg-white text-neutral-800">
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className={cn(promptConnected && "opacity-40 pointer-events-none")}>
            <label className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wide">
              Prompt *
            </label>
            <textarea
              value={nodeData.prompt ?? ""}
              onChange={(e) => updateNodeData(id, { prompt: e.target.value })}
              disabled={promptConnected}
              rows={3}
              placeholder="Enter prompt..."
              className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-black resize-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer"
          >
            {settingsOpen ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
            Settings
          </button>

          {settingsOpen && (
            <div className="space-y-3 pt-1 border-t border-neutral-200">
              <div className={cn(systemConnected && "opacity-40 pointer-events-none")}>
                <label className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wide">
                  System Prompt
                </label>
                <textarea
                  value={nodeData.systemPrompt ?? ""}
                  onChange={(e) =>
                    updateNodeData(id, { systemPrompt: e.target.value })
                  }
                  disabled={systemConnected}
                  rows={2}
                  placeholder="Optional system prompt..."
                  className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-black resize-none"
                />
              </div>

              <div className={cn(imageConnected && "opacity-40 pointer-events-none")}>
                <label className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wide">
                  Image (Vision)
                </label>
                <input
                  type="text"
                  value={
                    Array.isArray(nodeData.imageInput)
                      ? nodeData.imageInput.join(", ")
                      : (nodeData.imageInput ?? "")
                  }
                  onChange={(e) => updateNodeData(id, { imageInput: e.target.value })}
                  disabled={imageConnected}
                  placeholder="Connect or enter image URL..."
                  className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded px-2 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-black"
                />
              </div>

              <div className={cn(audioConnected && "opacity-40 pointer-events-none")}>
                <label className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wide">
                  Audio
                </label>
                <input
                  type="text"
                  value={nodeData.audioInput ?? ""}
                  onChange={(e) => updateNodeData(id, { audioInput: e.target.value })}
                  disabled={audioConnected}
                  placeholder="Connect or enter audio URL..."
                  className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded px-2 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-black"
                />
              </div>

              <div className={cn(fileConnected && "opacity-40 pointer-events-none")}>
                <label className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wide">
                  File
                </label>
                <input
                  type="text"
                  value={nodeData.fileInput ?? ""}
                  onChange={(e) => updateNodeData(id, { fileInput: e.target.value })}
                  disabled={fileConnected}
                  placeholder="Connect or enter file URL..."
                  className="w-full mt-1 bg-neutral-50 border border-neutral-200 rounded px-2 py-1.5 text-xs text-neutral-800 focus:outline-none focus:border-black"
                />
              </div>
            </div>
          )}

          {nodeData.response && (
            <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-3">
              <label className="text-[10px] text-neutral-500 font-semibold uppercase tracking-wide">
                Response
              </label>
              <p className="mt-1 text-xs text-neutral-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                {nodeData.response}
              </p>
            </div>
          )}

          {nodeData.lastError && (
            <p className="text-[10px] text-red-600 font-medium">{nodeData.lastError}</p>
          )}
        </div>
      </NodeShell>

      <div className="absolute left-0 top-[22%]">
        <NodeHandle type="target" position={Position.Left} id="prompt" />
      </div>
      <div className="absolute left-0 top-[38%]">
        <NodeHandle type="target" position={Position.Left} id="systemPrompt" />
      </div>
      <div className="absolute left-0 top-[54%]">
        <NodeHandle type="target" position={Position.Left} id="image" />
      </div>
      <div className="absolute left-0 top-[70%]">
        <NodeHandle type="target" position={Position.Left} id="audio" />
      </div>
      <div className="absolute left-0 top-[86%]">
        <NodeHandle type="target" position={Position.Left} id="file" />
      </div>
      <div className="absolute right-0 top-[50%]">
        <NodeHandle type="source" position={Position.Right} id="response" />
      </div>
    </div>
  );
});
