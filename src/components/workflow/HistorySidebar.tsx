"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  History,
  X,
} from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import { format } from "date-fns";

interface NodeExecution {
  id: string;
  nodeId: string;
  nodeType: string;
  nodeLabel: string | null;
  status: string;
  inputs: Record<string, unknown> | null;
  outputs: Record<string, unknown> | null;
  error: string | null;
  duration: number | null;
}

interface WorkflowRun {
  id: string;
  status: string;
  scope: string;
  duration: number | null;
  startedAt: string;
  nodeExecutions: NodeExecution[];
}

interface HistorySidebarProps {
  runs: WorkflowRun[];
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: "text-emerald-700 bg-emerald-50 border-emerald-200",
  FAILED: "text-red-700 bg-red-50 border-red-200",
  PARTIAL: "text-yellow-700 bg-yellow-50 border-yellow-200",
  RUNNING: "text-black bg-neutral-100 border-neutral-300 animate-pulse",
  PENDING: "text-neutral-500 bg-neutral-50 border-neutral-200",
};

function getNodeOutputSummary(exec: NodeExecution): string {
  if (exec.status === "FAILED") {
    return exec.error || "failed";
  }

  const outputs = exec.outputs || {};

  switch (exec.nodeType) {
    case "request-inputs": {
      if (exec.status === "RUNNING") return "loading inputs...";
      if (exec.status === "PENDING") return "queued...";
      const keys = Object.keys(outputs);
      if (keys.length > 0) {
        return keys.join(", ");
      }
      // Fallback to inputs keys if outputs are empty
      const inputs = exec.inputs || {};
      const inputKeys = Object.keys(inputs);
      if (inputKeys.length > 0) {
        return inputKeys.join(", ");
      }
      return "text_field, image_field";
    }
    case "crop-image": {
      if (exec.status === "RUNNING") return "cropping image...";
      if (exec.status === "PENDING") return "queued...";
      const img = outputs["output-image"] || outputs["imageUrl"] || "";
      if (typeof img === "string" && img) {
        if (img.startsWith("data:")) {
          return img.slice(0, 30) + "...";
        }
        if (img.startsWith("http")) {
          return img.slice(0, 30) + "...";
        }
        return img.slice(0, 30) + "...";
      }
      return "image cropped";
    }
    case "gemini": {
      if (exec.status === "RUNNING") return "generating response...";
      if (exec.status === "PENDING") return "queued...";
      const resp = outputs["response"] || "";
      if (typeof resp === "string" && resp) {
        return `"${resp.slice(0, 28)}${resp.length > 28 ? "..." : ""}"`;
      }
      return "response captured";
    }
    case "response": {
      if (exec.status === "RUNNING") return "waiting for inputs...";
      if (exec.status === "PENDING") return "queued...";
      const resVal = outputs["result"] || "";
      if (typeof resVal === "string" && resVal) {
        return `"${resVal.slice(0, 28)}${resVal.length > 28 ? "..." : ""}"`;
      }
      return "final result captured";
    }
    default: {
      const keys = Object.keys(outputs);
      if (keys.length > 0) {
        return JSON.stringify(outputs).slice(0, 30) + "...";
      }
      return "completed";
    }
  }
}

function getNodeLabel(exec: NodeExecution): string {
  if (exec.nodeLabel) return exec.nodeLabel;
  switch (exec.nodeType) {
    case "request-inputs":
      return "Request-Inputs";
    case "crop-image":
      return "Crop Image";
    case "gemini":
      return "Gemini";
    case "response":
      return "Response";
    default:
      return exec.nodeType;
  }
}

function getStatusIndicator(status: string): string {
  switch (status) {
    case "SUCCESS":
      return "✅";
    case "FAILED":
      return "❌";
    case "RUNNING":
      return "⏳";
    default:
      return "⚪";
  }
}

export function HistorySidebar({
  runs,
  open,
  onClose,
  onRefresh,
}: HistorySidebarProps) {
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  if (!open) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-[420px] z-45 border-l border-neutral-200 bg-white flex flex-col shadow-2xl">
      <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-200 bg-neutral-50">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-neutral-600" />
          <h2 className="text-sm font-semibold text-neutral-800">Run History</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="text-xs text-neutral-500 hover:text-black transition-colors cursor-pointer"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-neutral-500 hover:text-black transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#fafafa]">
        {runs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Clock className="w-8 h-8 text-neutral-300 mb-3" />
            <p className="text-sm text-neutral-500">No runs yet</p>
            <p className="text-xs text-neutral-400 mt-1">
              Execute your workflow to see history
            </p>
          </div>
        ) : (
          runs.map((run, idx) => {
            const isExpanded = expandedRun === run.id;
            return (
              <div
                key={run.id}
                className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-sm"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedRun(isExpanded ? null : run.id)
                  }
                  className="w-full flex items-center gap-3 p-3 hover:bg-neutral-50 transition-colors text-left cursor-pointer"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded border font-semibold uppercase",
                          STATUS_COLORS[run.status] ?? STATUS_COLORS.PENDING
                        )}
                      >
                        {run.status}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-semibold uppercase">
                        {run.scope}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600 mt-1 font-medium">
                      {format(new Date(run.startedAt), "MMM d, h:mm a")}
                    </p>
                  </div>
                  <span className="text-xs text-neutral-500 shrink-0 font-medium">
                    {formatDuration(run.duration)}
                  </span>
                </button>

                {isExpanded && (
                  <div className="border-t border-neutral-200 p-4 space-y-3 bg-white">
                    <div className="text-xs font-semibold text-neutral-800 border-b border-neutral-100 pb-2 select-text">
                      Run #{runs.length - idx} — {format(new Date(run.startedAt), "MMM d, yyyy h:mm a")} ({run.scope === "FULL" ? "Full" : run.scope === "PARTIAL" ? "Partial" : "Single"} Workflow)
                    </div>
                    <div className="space-y-2 select-text font-mono text-[11px] leading-relaxed">
                      {run.nodeExecutions.map((exec, execIdx, execArr) => {
                        const isLast = execIdx === execArr.length - 1;
                        const branch = isLast ? "└──" : "├──";
                        const label = getNodeLabel(exec);
                        const durationText = exec.duration != null ? `${(exec.duration / 1000).toFixed(1)}s` : "0.0s";
                        const statusIndicator = getStatusIndicator(exec.status);
                        const summary = getNodeOutputSummary(exec);

                        return (
                          <div key={exec.id} className="flex items-center gap-2 py-0.5 select-text text-neutral-700">
                            <div className="w-[140px] shrink-0 flex items-center gap-1 text-neutral-800 font-sans">
                              <span className="text-neutral-400 font-mono select-none">{branch}</span>
                              <span className="truncate font-semibold">{label}</span>
                            </div>
                            <div className="flex items-center gap-2 min-w-0 font-sans text-xs">
                              <span className="shrink-0">{statusIndicator}</span>
                              <span className="text-neutral-500 shrink-0">{durationText}</span>
                              <span className="text-neutral-400 shrink-0">→</span>
                              <span className="truncate text-neutral-800 select-all font-medium" title={summary}>
                                {summary}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
