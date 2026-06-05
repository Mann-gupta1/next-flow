import type { Connection, Edge, Node } from "@xyflow/react";
import type { PortDataType, WorkflowNodeData } from "./types";

const PORT_TYPES: Record<string, PortDataType> = {
  text_field: "text",
  image_field: "image",
  response: "text",
  prompt: "text",
  systemPrompt: "text",
  "input-image": "image",
  "output-image": "image",
  image: "image",
  audio: "audio",
  file: "file",
  result: "text",
};

export function getPortType(handleId: string | null | undefined): PortDataType {
  if (!handleId) return "any";
  if (PORT_TYPES[handleId]) return PORT_TYPES[handleId];
  if (handleId.startsWith("text_field")) return "text";
  if (handleId.startsWith("image_field")) return "image";
  return "any";
}

export function isValidConnection(
  connection: Connection | Edge,
  nodes: Node<WorkflowNodeData>[]
): boolean {
  const sourceNode = nodes.find((n) => n.id === connection.source);
  const targetNode = nodes.find((n) => n.id === connection.target);
  if (!sourceNode || !targetNode) return false;

  const sourceType = getPortType(connection.sourceHandle);
  const targetType = getPortType(connection.targetHandle);

  if (sourceType === "any" || targetType === "any") return true;
  return sourceType === targetType;
}

export function hasCycle(nodes: Node[], edges: Edge[]): boolean {
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target);
  }

  const visited = new Set<string>();
  const stack = new Set<string>();

  function dfs(nodeId: string): boolean {
    if (stack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    visited.add(nodeId);
    stack.add(nodeId);
    for (const neighbor of adjacency.get(nodeId) ?? []) {
      if (dfs(neighbor)) return true;
    }
    stack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (dfs(node.id)) return true;
  }
  return false;
}
