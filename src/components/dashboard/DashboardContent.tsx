"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  ExternalLink,
  Workflow,
  Loader2,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Sidebar } from "@/components/Sidebar";

interface WorkflowItem {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
  createdAt: string;
}

interface DashboardContentProps {
  initialWorkflows: WorkflowItem[];
}

export function DashboardContent({ initialWorkflows }: DashboardContentProps) {
  const router = useRouter();
  const [workflows, setWorkflows] = useState(initialWorkflows);
  const [creating, setCreating] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const createWorkflow = async (seedSample = false) => {
    setCreating(true);
    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: seedSample ? "Marketing Workflow" : "Untitled Workflow",
          seedSample,
        }),
      });
      if (res.ok) {
        const workflow = await res.json();
        router.push(`/workflow/${workflow.id}`);
      }
    } finally {
      setCreating(false);
    }
  };

  const deleteWorkflow = async (id: string) => {
    const res = await fetch(`/api/workflows/${id}`, { method: "DELETE" });
    if (res.ok) {
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
    }
    setMenuOpen(null);
  };

  const renameWorkflow = async (id: string) => {
    const res = await fetch(`/api/workflows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renameValue }),
    });
    if (res.ok) {
      setWorkflows((prev) =>
        prev.map((w) => (w.id === id ? { ...w, name: renameValue } : w))
      );
    }
    setRenaming(null);
    setMenuOpen(null);
  };

  return (
    <div className="h-screen w-full flex bg-white overflow-hidden">
      {/* Sidebar on the left */}
      <Sidebar activeItem="Flow" onCreateWorkflow={() => createWorkflow(false)} creating={creating} />

      {/* Main panel on the right */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8 bg-[#fafafa]">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-neutral-900">Workflows</h2>
                <p className="text-sm text-neutral-500 mt-1">
                  Build and manage your LLM workflows
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => createWorkflow(true)}
                  disabled={creating}
                  className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 bg-white hover:bg-neutral-50 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Sample Workflow
                </button>
                <button
                  type="button"
                  onClick={() => createWorkflow(false)}
                  disabled={creating}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-black hover:bg-neutral-800 text-sm font-medium text-white shadow-md transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {creating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  New Workflow
                </button>
              </div>
            </div>

            {workflows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 rounded-2xl border border-dashed border-neutral-200 bg-white shadow-sm">
                <Workflow className="w-12 h-12 text-neutral-350 mb-4" />
                <h3 className="text-lg font-medium text-neutral-800 mb-2">
                  No workflows yet
                </h3>
                <p className="text-sm text-neutral-500 mb-6 text-center max-w-sm">
                  Create your first workflow to start building LLM-powered pipelines
                  with image processing and AI generation.
                </p>
                <button
                  type="button"
                  onClick={() => createWorkflow(false)}
                  disabled={creating}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-black hover:bg-neutral-800 text-sm font-medium text-white shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Create Workflow
                </button>
              </div>
            ) : (
              <div className="grid gap-3">
                {workflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    className="group flex items-center justify-between p-4 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50/50 hover:border-neutral-300 shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                        <Workflow className="w-5 h-5 text-neutral-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        {renaming === workflow.id ? (
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") renameWorkflow(workflow.id);
                              if (e.key === "Escape") setRenaming(null);
                            }}
                            onBlur={() => renameWorkflow(workflow.id)}
                            className="bg-neutral-50 border border-black rounded px-2 py-1 text-sm text-neutral-800 focus:outline-none w-full max-w-xs"
                            autoFocus
                          />
                        ) : (
                          <h3 className="text-sm font-medium text-neutral-800 truncate">
                            {workflow.name}
                          </h3>
                        )}
                        <p className="text-xs text-neutral-500 mt-0.5">
                          Last edited {formatRelativeTime(workflow.updatedAt)}
                        </p>
                      </div>
                      {workflow.status === "RUNNING" && (
                        <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase px-2 py-1 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-250 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-pulse" />
                          Running
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => router.push(`/workflow/${workflow.id}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-neutral-600 hover:text-black hover:bg-neutral-100 transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open
                      </button>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setMenuOpen(menuOpen === workflow.id ? null : workflow.id)
                          }
                          className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {menuOpen === workflow.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setMenuOpen(null)}
                            />
                            <div className="absolute right-0 top-full mt-1 z-20 w-36 rounded-lg border border-neutral-200 bg-white shadow-lg py-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setRenaming(workflow.id);
                                  setRenameValue(workflow.name);
                                  setMenuOpen(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Rename
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteWorkflow(workflow.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-neutral-100 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
