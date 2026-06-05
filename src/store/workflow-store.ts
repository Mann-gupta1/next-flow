import { create } from "zustand";
import {
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type Viewport,
} from "@xyflow/react";
import type { WorkflowNodeData } from "@/lib/types";

interface HistoryState {
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
}

interface WorkflowStore {
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
  viewport: Viewport;
  selectedNodeIds: string[];
  history: HistoryState[];
  historyIndex: number;
  isRunning: boolean;
  runningNodeIds: string[];

  setNodes: (nodes: Node<WorkflowNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  setViewport: (viewport: Viewport) => void;
  onNodesChange: (changes: NodeChange<Node<WorkflowNodeData>>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  updateNodeData: (nodeId: string, data: Partial<WorkflowNodeData>) => void;
  addNode: (node: Node<WorkflowNodeData>) => void;
  deleteNodes: (nodeIds: string[]) => void;
  setSelectedNodeIds: (ids: string[]) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  setIsRunning: (running: boolean) => void;
  setRunningNodeIds: (ids: string[]) => void;
  reset: (
    nodes: Node<WorkflowNodeData>[],
    edges: Edge[],
    viewport?: Viewport
  ) => void;
}

const MAX_HISTORY = 50;

function snapshot(state: WorkflowStore): HistoryState {
  return {
    nodes: JSON.parse(JSON.stringify(state.nodes)),
    edges: JSON.parse(JSON.stringify(state.edges)),
  };
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 0.8 },
  selectedNodeIds: [],
  history: [],
  historyIndex: -1,
  isRunning: false,
  runningNodeIds: [],

  setNodes: (nodes) => set({ nodes }),

  setEdges: (edges) => set({ edges }),

  setViewport: (viewport) => set({ viewport }),

  onNodesChange: (changes) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },

  onEdgesChange: (changes) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },

  onConnect: (connection) => {
    const { edges } = get();
    const newEdge: Edge = {
      ...connection,
      id: `e-${connection.source}-${connection.target}-${Date.now()}`,
      type: "animated",
    };
    get().pushHistory();
    set({ edges: [...edges, newEdge] });
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...data } } : node
      ),
    });
  },

  addNode: (node) => {
    get().pushHistory();
    set({ nodes: [...get().nodes, node] });
  },

  deleteNodes: (nodeIds) => {
    const deletable = nodeIds.filter((id) => {
      const node = get().nodes.find((n) => n.id === id);
      return node?.type !== "request-inputs" && node?.type !== "response";
    });
    if (deletable.length === 0) return;

    get().pushHistory();
    set({
      nodes: get().nodes.filter((n) => !deletable.includes(n.id)),
      edges: get().edges.filter(
        (e) => !deletable.includes(e.source) && !deletable.includes(e.target)
      ),
    });
  },

  setSelectedNodeIds: (ids) => set({ selectedNodeIds: ids }),

  pushHistory: () => {
    const { history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(snapshot(get()));
    if (newHistory.length > MAX_HISTORY) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < 0) return;
    const current = snapshot(get());
    const prev = history[historyIndex];
    const newHistory = [...history];
    if (historyIndex === history.length - 1) {
      newHistory.push(current);
    }
    set({
      nodes: prev.nodes,
      edges: prev.edges,
      history: newHistory,
      historyIndex: historyIndex - 1,
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 2) return;
    const next = history[historyIndex + 2];
    if (!next) return;
    set({
      nodes: next.nodes,
      edges: next.edges,
      historyIndex: historyIndex + 1,
    });
  },

  setIsRunning: (running) => set({ isRunning: running }),

  setRunningNodeIds: (ids) => set({ runningNodeIds: ids }),

  reset: (nodes, edges, viewport) =>
    set({
      nodes,
      edges,
      viewport: viewport ?? { x: 0, y: 0, zoom: 0.8 },
      history: [],
      historyIndex: -1,
      selectedNodeIds: [],
      isRunning: false,
      runningNodeIds: [],
    }),
}));
