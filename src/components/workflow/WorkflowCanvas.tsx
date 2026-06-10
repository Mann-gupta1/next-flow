"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  Controls,
  Panel,
  useReactFlow,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Play,
  Undo2,
  Redo2,
  Trash2,
  Download,
  Upload,
  History,
  ArrowLeft,
  Save,
  Loader2,
  Terminal,
  Send,
  Key,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWorkflowStore } from "@/store/workflow-store";
import { Sidebar } from "@/components/Sidebar";
import { RequestInputsNode } from "./nodes/RequestInputsNode";
import { CropImageNode } from "./nodes/CropImageNode";
import { GeminiNode } from "./nodes/GeminiNode";
import { ResponseNode } from "./nodes/ResponseNode";
import { AnimatedEdge } from "./edges/AnimatedEdge";
import { NodePicker, createNodeFromType } from "./NodePicker";
import { HistorySidebar } from "./HistorySidebar";
import { PremiumLoader } from "./PremiumLoader";
import { isValidConnection, hasCycle } from "@/lib/connections";
import type { WorkflowNodeData } from "@/lib/types";
import { cn } from "@/lib/utils";

const nodeTypes = {
  "request-inputs": RequestInputsNode,
  "crop-image": CropImageNode,
  gemini: GeminiNode,
  response: ResponseNode,
};

const edgeTypes = {
  animated: AnimatedEdge,
};

interface WorkflowCanvasProps {
  workflowId: string;
  workflowName: string;
  initialNodes: Node<WorkflowNodeData>[];
  initialEdges: ReturnType<typeof useWorkflowStore.getState>["edges"];
  initialViewport?: { x: number; y: number; zoom: number };
}

function WorkflowCanvasInner({
  workflowId,
  workflowName,
  initialNodes,
  initialEdges,
  initialViewport,
}: WorkflowCanvasProps) {
  const router = useRouter();
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setNodes,
    setEdges,
    addNode,
    deleteNodes,
    undo,
    redo,
    pushHistory,
    reset,
    selectedNodeIds,
    setSelectedNodeIds,
    setIsRunning,
    setRunningNodeIds,
    isRunning,
  } = useWorkflowStore();

  const { fitView, screenToFlowPosition } = useReactFlow();
  const [name, setName] = useState(workflowName);
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [userApiKey, setUserApiKey] = useState("");


  useEffect(() => {
    if (typeof window !== "undefined") {
      setUserApiKey(localStorage.getItem("gemini_api_key") || "");
    }
  }, []);

  const [activeTab, setActiveTab] = useState<"playground" | "api" | "workflow">("workflow");
  const [cloning, setCloning] = useState(false);
  const [apiLang, setApiLang] = useState<"curl" | "js" | "python">("curl");
  const [runs, setRuns] = useState<Array<{
    id: string;
    status: string;
    scope: string;
    duration: number | null;
    startedAt: string;
    nodeExecutions: Array<{
      id: string;
      nodeId: string;
      nodeType: string;
      nodeLabel: string | null;
      status: string;
      inputs: Record<string, unknown> | null;
      outputs: Record<string, unknown> | null;
      error: string | null;
      duration: number | null;
    }>;
  }>>([]);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      reset(initialNodes, initialEdges, initialViewport);
      initialized.current = true;
      setTimeout(() => fitView({ padding: 0.2 }), 100);
    }
  }, [initialNodes, initialEdges, initialViewport, reset, fitView]);

  const saveWorkflow = useCallback(async () => {
    setSaving(true);
    try {
      await fetch(`/api/workflows/${workflowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, nodes, edges }),
      });
    } finally {
      setSaving(false);
    }
  }, [workflowId, name, nodes, edges]);

  useEffect(() => {
    if (!initialized.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveWorkflow();
    }, 1500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [nodes, edges, name, saveWorkflow]);

  const fetchRuns = useCallback(async () => {
    const res = await fetch(`/api/workflows/${workflowId}/runs`);
    if (res.ok) {
      const data = await res.json();
      setRuns(data);

      const activeRun = data.find(
        (r: any) => r.status === "RUNNING" || r.status === "PENDING"
      );

      if (activeRun) {
        setIsRunning(true);
        const runningIds = activeRun.nodeExecutions
          .filter((exec: any) => exec.status === "RUNNING" || exec.status === "PENDING")
          .map((exec: any) => exec.nodeId);
        setRunningNodeIds(runningIds);

        // If not viewing a historical run, show live updates in the editor nodes
        if (!selectedRunId) {
          const currentNodes = useWorkflowStore.getState().nodes;
          const updatedNodes = currentNodes.map((node) => {
            const exec = activeRun.nodeExecutions.find(
              (e: any) => e.nodeId === node.id
            );
            if (!exec) return node;

            const isNodeRunning = exec.status === "RUNNING" || exec.status === "PENDING";
            const outputs = exec.outputs || {};
            const nodeSpecificData: any = {};

            if (exec.status === "SUCCESS") {
              if (node.type === "crop-image") {
                nodeSpecificData.outputImage = outputs["output-image"] as string;
              } else if (node.type === "gemini") {
                nodeSpecificData.response = outputs.response as string;
              } else if (node.type === "response") {
                nodeSpecificData.result = outputs.result as string;
              }
            }

            return {
              ...node,
              data: {
                ...node.data,
                ...nodeSpecificData,
                isRunning: isNodeRunning,
                lastError: exec.status === "FAILED" ? (exec.error || "Execution failed") : undefined,
              },
            };
          });
          setNodes(updatedNodes);
        }
      } else {
        setRunningNodeIds([]);
        if (useWorkflowStore.getState().isRunning) {
          setIsRunning(false);
          // If we just finished running, and we are in editor mode (no selectedRunId), reload final outputs
          if (!selectedRunId && initialized.current) {
            const workflowRes = await fetch(`/api/workflows/${workflowId}`);
            if (workflowRes.ok) {
              const workflow = await workflowRes.json();
              setNodes(workflow.nodes);
            }
          }
        }
      }
    }
  }, [workflowId, selectedRunId, setIsRunning, setRunningNodeIds, setNodes]);

  // Update canvas nodes based on selectedRunId (historical or active run)
  useEffect(() => {
    if (selectedRunId) {
      const run = runs.find((r) => r.id === selectedRunId);
      if (run) {
        const currentNodes = useWorkflowStore.getState().nodes;
        const updatedNodes = currentNodes.map((node) => {
          const exec = run.nodeExecutions.find((e) => e.nodeId === node.id);
          if (!exec) {
            return {
              ...node,
              data: {
                ...node.data,
                isReadOnly: true,
              },
            };
          }

          const isNodeRunning = exec.status === "RUNNING" || exec.status === "PENDING";
          const outputs = exec.outputs || {};
          const nodeSpecificData: any = {};

          if (exec.status === "SUCCESS") {
            if (node.type === "crop-image") {
              nodeSpecificData.outputImage = outputs["output-image"] as string;
            } else if (node.type === "gemini") {
              nodeSpecificData.response = outputs.response as string;
            } else if (node.type === "response") {
              nodeSpecificData.result = outputs.result as string;
            }
          }

          return {
            ...node,
            data: {
              ...node.data,
              ...nodeSpecificData,
              isReadOnly: true,
              isRunning: isNodeRunning,
              lastError: exec.status === "FAILED" ? (exec.error || "Execution failed") : undefined,
            },
          };
        });
        setNodes(updatedNodes);
      }
    } else {
      // Fetch latest workflow nodes from DB when returning to Editor
      if (initialized.current) {
        const reloadWorkflowNodes = async () => {
          const workflowRes = await fetch(`/api/workflows/${workflowId}`);
          if (workflowRes.ok) {
            const workflow = await workflowRes.json();
            setNodes(workflow.nodes);
          }
        };
        reloadWorkflowNodes();
      }
    }
  }, [selectedRunId, runs, workflowId, setNodes]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  useEffect(() => {
    const hasRunningRun = runs.some(
      (r) => r.status === "RUNNING" || r.status === "PENDING"
    );
    if (isRunning || hasRunningRun) {
      const interval = setInterval(() => {
        fetchRuns();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isRunning, runs, fetchRuns]);

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!isValidConnection(connection, nodes)) return;
      const testEdges = [
        ...edges,
        {
          ...connection,
          id: "test",
          source: connection.source!,
          target: connection.target!,
        },
      ];
      if (hasCycle(nodes, testEdges)) return;
      pushHistory();
      onConnect(connection);
    },
    [nodes, edges, onConnect, pushHistory]
  );

  const isValidConnectionCallback = useCallback(
    (connection: Connection | Edge) => {
      if (!isValidConnection(connection, nodes)) return false;
      const testEdges = [
        ...edges,
        {
          ...connection,
          id: "test",
          source: connection.source,
          target: connection.target,
        },
      ];
      return !hasCycle(nodes, testEdges);
    },
    [nodes, edges]
  );

  const handleAddNode = useCallback(
    (type: string, label: string) => {
      const position = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      });
      const node = createNodeFromType(type, label, position);
      addNode(node as Node<WorkflowNodeData>);
    },
    [addNode, screenToFlowPosition]
  );

  const executeWorkflow = useCallback(
    async (scope: "SINGLE" | "PARTIAL" | "FULL", nodeIds?: string[]) => {
      setIsRunning(true);
      const targetIds =
        nodeIds ??
        nodes
          .filter((n) => n.type === "crop-image" || n.type === "gemini")
          .map((n) => n.id);
      setRunningNodeIds(targetIds);

      nodes.forEach((n) => {
        if (targetIds.includes(n.id)) {
          useWorkflowStore.getState().updateNodeData(n.id, { isRunning: true });
        }
      });

      try {
        await saveWorkflow();
        const res = await fetch(`/api/workflows/${workflowId}/execute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scope,
            nodeIds: targetIds,
            geminiApiKey: typeof window !== "undefined" ? localStorage.getItem("gemini_api_key") || undefined : undefined
          }),
        });

        if (res.ok) {
          await fetchRuns();
        } else {
          setIsRunning(false);
          setRunningNodeIds([]);
          nodes.forEach((n) => {
            useWorkflowStore.getState().updateNodeData(n.id, { isRunning: false });
          });
        }
      } catch (err) {
        setIsRunning(false);
        setRunningNodeIds([]);
        nodes.forEach((n) => {
          useWorkflowStore.getState().updateNodeData(n.id, { isRunning: false });
        });
      }
    },
    [workflowId, nodes, setIsRunning, setRunningNodeIds, saveWorkflow, fetchRuns]
  );

  const handleRun = useCallback(() => {
    if (selectedNodeIds.length > 0) {
      const executable = selectedNodeIds.filter((id) => {
        const node = nodes.find((n) => n.id === id);
        return node?.type === "crop-image" || node?.type === "gemini";
      });
      if (executable.length === 1) {
        executeWorkflow("SINGLE", executable);
      } else if (executable.length > 1) {
        executeWorkflow("PARTIAL", executable);
      } else {
        executeWorkflow("FULL");
      }
    } else {
      executeWorkflow("FULL");
    }
  }, [selectedNodeIds, nodes, executeWorkflow]);

  const handleExport = useCallback(() => {
    const data = { name, nodes, edges };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [name, nodes, edges]);

  const handleImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const data = JSON.parse(text);
      pushHistory();
      setNodes(data.nodes);
      setEdges(data.edges);
      if (data.name) setName(data.name);
      await fetch(`/api/workflows/${workflowId}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    };
    input.click();
  }, [workflowId, pushHistory, setNodes, setEdges]);

  const onSelectionChange = useCallback(
    ({ nodes: selected }: { nodes: Node[] }) => {
      setSelectedNodeIds(selected.map((n) => n.id));
    },
    [setSelectedNodeIds]
  );

  const defaultEdgeOptions = useMemo(
    () => ({ type: "animated", animated: true }),
    []
  );

  const handleClone = async () => {
    setCloning(true);
    try {
      const res = await fetch(`/api/workflows/${workflowId}/clone`, {
        method: "POST",
      });
      if (res.ok) {
        const cloned = await res.json();
        router.push(`/workflow/${cloned.id}`);
      }
    } catch (err) {
      console.error("Cloning workflow failed", err);
    } finally {
      setCloning(false);
    }
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  return (
    <div className="h-screen w-full flex bg-[#08080f] overflow-hidden">
      {/* Sidebar on the left */}
      <Sidebar activeItem="Flow" />

      {/* Main panel on the right */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header containing Back Button, Workflow Title and Tabs */}
        <header className="flex flex-col border-b border-neutral-200 bg-white/90 backdrop-blur-md z-10 px-6 py-4 gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center justify-center w-8 h-8 rounded-lg border border-neutral-200 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-transparent border-none text-base font-semibold text-neutral-900 focus:outline-none focus:ring-1 focus:ring-black rounded px-2 py-0.5"
                />
                {saving && (
                  <span className="text-xs text-neutral-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Saving...
                  </span>
                )}
              </div>
            </div>

            {/* Quick Actions (only visible/relevant for workflow tab, or general) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={undo}
                className="p-2 rounded-lg text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer"
                title="Undo"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={redo}
                className="p-2 rounded-lg text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer"
                title="Redo"
              >
                <Redo2 className="w-4 h-4" />
              </button>
              <div className="w-px h-6 bg-neutral-200 mx-1" />
              <button
                type="button"
                onClick={handleImport}
                className="p-2 rounded-lg text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer"
                title="Import JSON"
              >
                <Upload className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="p-2 rounded-lg text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer"
                title="Export JSON"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => deleteNodes(selectedNodeIds)}
                disabled={selectedNodeIds.length === 0}
                className="p-2 rounded-lg text-neutral-500 hover:text-red-600 hover:bg-neutral-100 transition-colors disabled:opacity-30 cursor-pointer"
                title="Delete selected"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="w-px h-6 bg-neutral-200 mx-1" />
              <button
                type="button"
                onClick={() => setHistoryOpen(!historyOpen)}
                className={cn(
                  "p-2 rounded-lg transition-colors cursor-pointer",
                  historyOpen
                    ? "text-black bg-neutral-100 border border-neutral-300"
                    : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100"
                )}
                title="History"
              >
                <History className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={saveWorkflow}
                className="p-2 rounded-lg text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer"
                title="Save"
              >
                <Save className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setKeyModalOpen(true)}
                className={cn(
                  "p-2 rounded-lg transition-colors cursor-pointer text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100",
                  userApiKey ? "text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100/50 border border-emerald-200" : ""
                )}
                title={userApiKey ? "Gemini API Key Configured" : "Configure Gemini API Key"}
              >
                <Key className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRun}
                disabled={isRunning}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer",
                  isRunning
                    ? "bg-neutral-400 text-white cursor-not-allowed"
                    : "bg-black hover:bg-neutral-800 text-white shadow-sm"
                )}
              >
                {isRunning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {selectedNodeIds.length > 0 ? "Run Selected" : "Run All"}
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-6 border-t border-neutral-200 pt-3">
            {(["playground", "api", "workflow"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "pb-2 text-sm font-medium transition-all relative capitalize cursor-pointer",
                  activeTab === tab
                    ? "text-black font-semibold"
                    : "text-neutral-400 hover:text-neutral-700"
                )}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black rounded-full" />
                )}
              </button>
            ))}
          </div>
        </header>

        {/* Tab Contents */}
        <div className="flex-1 overflow-hidden relative p-6 bg-[#fafafa]">
          {isRunning && activeTab === "playground" && <PremiumLoader />}
          {activeTab === "workflow" && (
            <div className="w-full h-full flex flex-col rounded-2xl border border-neutral-200 bg-white overflow-hidden relative shadow-sm">
              <div className="px-6 py-4 flex items-center justify-between border-b border-neutral-200 bg-neutral-50">
                <span className="text-sm font-semibold text-neutral-800">Workflow Structure</span>
                <button
                  onClick={handleClone}
                  disabled={cloning}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-50 hover:text-black transition-all cursor-pointer active:scale-[0.98] disabled:opacity-55"
                >
                  {cloning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Clone Workflow
                </button>
              </div>

              <div className="flex-1 relative">
                {selectedRunId &&
                  runs.find((r) => r.id === selectedRunId)?.status !== "RUNNING" &&
                  runs.find((r) => r.id === selectedRunId)?.status !== "PENDING" && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50/95 backdrop-blur-md shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-xs font-semibold text-amber-800">
                        Viewing Historical Run (Read-Only)
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedRunId(null)}
                        className="ml-2 px-3 py-1 bg-amber-950 text-white rounded-lg text-[11px] font-semibold hover:bg-amber-900 transition-all cursor-pointer active:scale-95"
                      >
                        Back to Editor
                      </button>
                    </div>
                  )}
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={handleConnect}
                  isValidConnection={isValidConnectionCallback}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  defaultEdgeOptions={defaultEdgeOptions}
                  onSelectionChange={onSelectionChange}
                  fitView
                  snapToGrid
                  snapGrid={[20, 20]}
                  deleteKeyCode={["Backspace", "Delete"]}
                  onNodesDelete={(deleted) => {
                    const ids = deleted.map((n) => n.id);
                    deleteNodes(ids);
                  }}
                  className="workflow-canvas"
                  proOptions={{ hideAttribution: true }}
                >
                  <Background
                    variant={BackgroundVariant.Dots}
                    gap={20}
                    size={1}
                    color="rgba(0,0,0,0.05)"
                  />
                  <MiniMap
                    nodeColor="#262626"
                    maskColor="rgba(250,250,250,0.8)"
                    className="!bg-white/95 !border !border-neutral-200 !rounded-xl"
                  />
                  <Controls
                    className="!bg-white/95 !border !border-neutral-200 !rounded-xl !shadow-xl [&>button]:!bg-transparent [&>button]:!border-neutral-200 [&>button]:!text-neutral-600 [&>button:hover]:!bg-neutral-50"
                  />
                </ReactFlow>

                <NodePicker onAddNode={handleAddNode} />

                {/* Animated Equalizer floating widget */}
                <div className="absolute bottom-4 right-4 z-20 bg-white/95 backdrop-blur-md border border-neutral-200 rounded-2xl p-4 flex items-center justify-center gap-1 shadow-xl">
                  <div className="flex items-end gap-1.5 h-8 px-1">
                    <div className="w-1 bg-black rounded-full animate-[equalizer-bar-1_1.2s_ease-in-out_infinite]" style={{ height: "12px" }} />
                    <div className="w-1 bg-neutral-700 rounded-full animate-[equalizer-bar-2_1.5s_ease-in-out_infinite]" style={{ height: "24px" }} />
                    <div className="w-1 bg-neutral-500 rounded-full animate-[equalizer-bar-3_0.9s_ease-in-out_infinite]" style={{ height: "8px" }} />
                    <div className="w-1 bg-neutral-400 rounded-full animate-[equalizer-bar-4_1.4s_ease-in-out_infinite]" style={{ height: "20px" }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "playground" && (
            <div className="w-full h-full flex flex-col md:flex-row gap-6 overflow-hidden">
              {/* Playground Inputs Panel */}
              <div className="flex-1 rounded-2xl border border-neutral-200 bg-white p-6 flex flex-col overflow-hidden shadow-sm">
                <h3 className="text-base font-semibold text-neutral-800 mb-4 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-neutral-600" />
                  Playground Inputs
                </h3>
                
                <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                  {(() => {
                    const requestNode = nodes.find((n) => n.type === "request-inputs");
                    const fields: any[] = requestNode ? (requestNode.data as any).fields || [] : [];
                    
                    if (fields.length === 0) {
                      return (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-dashed border-neutral-200 rounded-xl bg-neutral-50/50">
                          <p className="text-sm text-neutral-500 max-w-xs">
                            No inputs configured. Please add or verify inputs in the "Request Inputs" node in your workflow.
                          </p>
                        </div>
                      );
                    }
                    
                    return fields.map((field) => (
                      <div key={field.id} className="space-y-2">
                        <label className="text-xs font-semibold text-neutral-500 block uppercase tracking-wider">
                          {field.name}
                        </label>
                        {field.type === "text_field" ? (
                          <textarea
                            value={field.value ?? ""}
                            onChange={(e) => {
                              if (!requestNode) return;
                              const updatedFields = fields.map((f) =>
                                f.id === field.id ? { ...f, value: e.target.value } : f
                              );
                              useWorkflowStore.getState().updateNodeData(requestNode.id, { fields: updatedFields });
                            }}
                            rows={4}
                            placeholder="Enter playground input..."
                            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 text-sm text-neutral-850 placeholder:text-neutral-400 focus:outline-none focus:border-black resize-none"
                          />
                        ) : (
                          <div className="space-y-3">
                            {field.imageUrl ? (
                              <div className="relative rounded-xl overflow-hidden border border-neutral-200 max-w-sm">
                                <img
                                  src={field.imageUrl}
                                  alt={field.imageName || "Playground Upload"}
                                  className="w-full h-36 object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!requestNode) return;
                                    const updatedFields = fields.map((f) =>
                                      f.id === field.id ? { ...f, imageUrl: "", imageName: "" } : f
                                    );
                                    useWorkflowStore.getState().updateNodeData(requestNode.id, { fields: updatedFields });
                                  }}
                                  className="absolute top-2 right-2 p-1.5 bg-black/80 rounded-lg text-white hover:bg-black transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={async () => {
                                  const input = document.createElement("input");
                                  input.type = "file";
                                  input.accept = "image/*";
                                  input.onchange = async (e) => {
                                    const file = (e.target as HTMLInputElement).files?.[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = () => {
                                      if (!requestNode) return;
                                      const updatedFields = fields.map((f) =>
                                        f.id === field.id ? { ...f, imageUrl: reader.result as string, imageName: file.name } : f
                                      );
                                      useWorkflowStore.getState().updateNodeData(requestNode.id, { fields: updatedFields });
                                    };
                                    reader.readAsDataURL(file);
                                  };
                                  input.click();
                                }}
                                className="flex items-center justify-center gap-2 w-full py-6 rounded-xl border border-dashed border-neutral-200 text-xs text-neutral-500 hover:border-black hover:text-black transition-colors cursor-pointer"
                              >
                                <Upload className="w-4 h-4" />
                                Upload Image for {field.name}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ));
                  })()}
                </div>

                <button
                  onClick={handleRun}
                  disabled={isRunning}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-black hover:bg-neutral-800 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-4 cursor-pointer"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Running Workflow...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Run Workflow
                    </>
                  )}
                </button>
              </div>

              {/* Playground Outputs Panel */}
              <div className="flex-1 rounded-2xl border border-neutral-200 bg-white p-6 flex flex-col overflow-hidden shadow-sm">
                <h3 className="text-base font-semibold text-neutral-800 mb-4 flex items-center gap-2">
                  <Send className="w-4 h-4 text-neutral-600" />
                  Output Response
                </h3>
                
                <div className="flex-1 overflow-y-auto pr-2 flex flex-col">
                  {(() => {
                    const responseNode = nodes.find((n) => n.type === "response");
                    const responseVal = responseNode ? (responseNode.data as any).result || (responseNode.data as any).response || "" : "";
                    
                    const geminiNodes = nodes.filter((n) => n.type === "gemini");
                    const hasGeminiResponses = geminiNodes.some((n) => (n.data as any).response);

                    if (!responseVal && !hasGeminiResponses) {
                      return (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-neutral-200 rounded-xl bg-neutral-50/50">
                          <p className="text-sm text-neutral-500 max-w-xs">
                            Run the workflow to see execution outputs here.
                          </p>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="space-y-4">
                        {responseVal && (
                          <div className="space-y-2">
                            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block font-medium">
                              Response Result
                            </span>
                            <div className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-sm text-neutral-800 whitespace-pre-wrap font-sans leading-relaxed">
                              {responseVal}
                            </div>
                          </div>
                        )}
                        
                        {geminiNodes.map((n) => {
                          const nodeResp = (n.data as any).response;
                          if (!nodeResp) return null;
                          return (
                            <div key={n.id} className="space-y-2">
                              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block font-medium">
                                Gemini Response ({n.data.label || "AI Model"})
                              </span>
                              <div className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-sm text-neutral-850 whitespace-pre-wrap font-sans leading-relaxed">
                                {nodeResp}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {activeTab === "api" && (
            <div className="w-full h-full flex flex-col rounded-2xl border border-neutral-200 bg-white p-6 overflow-hidden shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-base font-semibold text-neutral-800">API Documentation</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">Integrate this workflow into your applications</p>
                </div>
                <div className="flex items-center gap-1.5 bg-neutral-100 border border-neutral-200 rounded-xl p-1">
                  {(["curl", "js", "python"] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setApiLang(lang)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all",
                        apiLang === lang ? "bg-black text-white" : "text-neutral-500 hover:text-neutral-800"
                      )}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-6">
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase text-neutral-500 tracking-wide">Endpoint</span>
                  <div className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 flex items-center justify-between font-mono text-xs text-neutral-800">
                    <span className="text-emerald-700 font-bold shrink-0 mr-2">POST</span>
                    <span className="truncate flex-1 select-all">{`${origin}/api/workflows/${workflowId}/execute`}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase text-neutral-500 tracking-wide">Request Header</span>
                  <pre className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 font-mono text-xs text-neutral-800">
                    {`Content-Type: application/json\nAuthorization: Bearer <YOUR_API_KEY>`}
                  </pre>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase text-neutral-500 tracking-wide">Code Integration Snippet</span>
                  <div className="relative">
                    <pre className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 font-mono text-xs text-neutral-800 overflow-x-auto whitespace-pre">
                      {apiLang === "curl" &&
                        `curl -X POST "${origin}/api/workflows/${workflowId}/execute" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "scope": "FULL"\n  }'`}
                      {apiLang === "js" &&
                        `const response = await fetch("${origin}/api/workflows/${workflowId}/execute", {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({\n    scope: "FULL"\n  })\n});\nconst data = await response.json();\nconsole.log(data);`}
                      {apiLang === "python" &&
                        `import requests\n\nurl = "${origin}/api/workflows/${workflowId}/execute"\npayload = {"scope": "FULL"}\nheaders = {"Content-Type": "application/json"}\n\nresponse = requests.post(url, json=payload, headers=headers)\nprint(response.json())`}
                    </pre>
                    <button
                      onClick={() => {
                        const code =
                          apiLang === "curl"
                            ? `curl -X POST "${origin}/api/workflows/${workflowId}/execute" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "scope": "FULL"\n  }'`
                            : apiLang === "js"
                            ? `const response = await fetch("${origin}/api/workflows/${workflowId}/execute", {\n  method: "POST",\n  headers: {\n    "Content-Type": "application/json"\n  },\n  body: JSON.stringify({\n    scope: "FULL"\n  })\n});\nconst data = await response.json();\nconsole.log(data);`
                            : `import requests\n\nurl = "${origin}/api/workflows/${workflowId}/execute"\npayload = {"scope": "FULL"}\nheaders = {"Content-Type": "application/json"}\n\nresponse = requests.post(url, json=payload, headers=headers)\nprint(response.json())`;
                        navigator.clipboard.writeText(code);
                      }}
                      className="absolute top-3 right-3 bg-white border border-neutral-200 text-neutral-500 hover:text-black p-2 rounded-lg text-xs cursor-pointer hover:bg-neutral-50 transition-colors"
                    >
                      Copy Code
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <HistorySidebar
        runs={runs}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onRefresh={fetchRuns}
        selectedRunId={selectedRunId}
        onSelectRun={setSelectedRunId}
      />

      {/* API Key Modal */}
      {keyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl p-6 w-[440px] max-w-full mx-4">
            <h3 className="text-base font-bold text-neutral-900 mb-2">Gemini API Configuration</h3>
            <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
              We utilize a shared free-tier Gemini API key by default. However, this key is subject to rate limits.
              If executions fail with rate limits, you can optionally provide your own API key below.
              Your key is saved locally in your browser and is never stored on our database.
            </p>
            <div className="space-y-3 mb-6">
              <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block font-sans">
                Gemini API Key (Optional)
              </label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={userApiKey}
                onChange={(e) => setUserApiKey(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-neutral-850 placeholder:text-neutral-400 focus:outline-none focus:border-black font-mono"
              />
            </div>
            <div className="flex items-center justify-end gap-2 text-xs font-medium">
              <button
                type="button"
                onClick={() => {
                  setUserApiKey("");
                  localStorage.removeItem("gemini_api_key");
                  setKeyModalOpen(false);
                }}
                className="px-4 py-2 rounded-lg text-neutral-500 hover:text-red-650 hover:bg-neutral-50 transition-all cursor-pointer"
              >
                Clear Key
              </button>
              <button
                type="button"
                onClick={() => setKeyModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 bg-white hover:bg-neutral-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem("gemini_api_key", userApiKey);
                  setKeyModalOpen(false);
                }}
                className="px-4 py-2 rounded-lg bg-black hover:bg-neutral-800 text-white shadow-sm transition-all cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
