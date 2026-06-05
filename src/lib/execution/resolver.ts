import type { Edge, Node } from "@xyflow/react";
import type {
  CropImageData,
  GeminiData,
  InputField,
  RequestInputsData,
  ResponseData,
  WorkflowNodeData,
} from "../types";

export type ResolvedOutputs = Record<string, Record<string, unknown>>;

export function resolveRequestInputs(
  data: RequestInputsData
): Record<string, unknown> {
  const outputs: Record<string, unknown> = {};
  for (const field of data.fields) {
    if (field.type === "text_field") {
      outputs[field.name] = field.value ?? "";
    } else if (field.type === "image_field") {
      outputs[field.name] = field.imageUrl ?? "";
    }
  }
  return outputs;
}

function getCachedOutput(
  node: Node<WorkflowNodeData>,
  handle: string
): unknown {
  const data = node.data;
  switch (node.type) {
    case "request-inputs": {
      const fields = (data as RequestInputsData).fields;
      const field = fields.find((f) => f.name === handle);
      if (!field) return undefined;
      return field.type === "text_field" ? field.value : field.imageUrl;
    }
    case "crop-image":
      if (handle === "output-image") return (data as CropImageData).outputImage;
      break;
    case "gemini":
      if (handle === "response") return (data as GeminiData).response;
      break;
    case "response":
      if (handle === "result") return (data as ResponseData).result;
      break;
  }
  return undefined;
}

export function getUpstreamValue(
  nodeId: string,
  handleId: string,
  edges: Edge[],
  outputs: ResolvedOutputs,
  nodes: Node<WorkflowNodeData>[]
): unknown {
  const incoming = edges.filter(
    (e) => e.target === nodeId && e.targetHandle === handleId
  );

  if (incoming.length === 0) return undefined;

  const values: unknown[] = [];
  for (const edge of incoming) {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    if (!sourceNode) continue;
    const handle = edge.sourceHandle ?? "response";
    const sourceOutputs = outputs[edge.source];
    const value =
      sourceOutputs?.[handle] ?? getCachedOutput(sourceNode, handle);
    if (value !== undefined && value !== "") {
      values.push(value);
    }
  }

  if (values.length === 0) return undefined;
  if (values.length === 1) return values[0];
  return values;
}

export function resolveNodeInputs(
  node: Node<WorkflowNodeData>,
  edges: Edge[],
  outputs: ResolvedOutputs,
  nodes: Node<WorkflowNodeData>[]
): Record<string, unknown> {
  const data = node.data;

  switch (node.type) {
    case "request-inputs":
      return resolveRequestInputs(data as RequestInputsData);

    case "crop-image": {
      const cropData = data as CropImageData;
      const connectedImage = getUpstreamValue(
        node.id,
        "input-image",
        edges,
        outputs,
        nodes
      );
      return {
        imageUrl: (connectedImage as string) || cropData.inputImage || "",
        positionX: cropData.positionX,
        positionY: cropData.positionY,
        width: cropData.width,
        height: cropData.height,
      };
    }

    case "gemini": {
      const geminiData = data as GeminiData;
      const prompt =
        getUpstreamValue(node.id, "prompt", edges, outputs, nodes) ??
        geminiData.prompt ??
        "";
      const systemPrompt =
        getUpstreamValue(node.id, "systemPrompt", edges, outputs, nodes) ??
        geminiData.systemPrompt ??
        "";
      const imageValue = getUpstreamValue(node.id, "image", edges, outputs, nodes);
      const audioValue =
        getUpstreamValue(node.id, "audio", edges, outputs, nodes) ??
        geminiData.audioInput;
      const fileValue =
        getUpstreamValue(node.id, "file", edges, outputs, nodes) ??
        geminiData.fileInput;

      let imageUrls: string[] = [];
      if (Array.isArray(imageValue)) {
        imageUrls = imageValue.filter(Boolean) as string[];
      } else if (typeof imageValue === "string" && imageValue) {
        imageUrls = [imageValue];
      } else if (geminiData.imageInput) {
        imageUrls = Array.isArray(geminiData.imageInput)
          ? geminiData.imageInput
          : [geminiData.imageInput];
      }

      return {
        model: geminiData.model,
        prompt: prompt as string,
        systemPrompt: systemPrompt as string,
        imageUrls,
        audioUrl: audioValue as string | undefined,
        fileUrl: fileValue as string | undefined,
      };
    }

    case "response": {
      const responseData = data as ResponseData;
      const result =
        getUpstreamValue(node.id, "result", edges, outputs, nodes) ??
        responseData.result ??
        "";
      return { result };
    }

    default:
      return {};
  }
}

export function buildExecutionLevels(
  nodes: Node[],
  edges: Edge[],
  targetNodeIds: string[],
  fullRun = false
): string[][] {
  const targetSet = new Set(targetNodeIds);
  const relevantNodes = fullRun
    ? new Set(nodes.filter((n) => isExecutableNode(n.type ?? "")).map((n) => n.id))
    : targetSet;

  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const nodeId of relevantNodes) {
    inDegree.set(nodeId, 0);
    adjacency.set(nodeId, []);
  }

  for (const edge of edges) {
    if (relevantNodes.has(edge.source) && relevantNodes.has(edge.target)) {
      adjacency.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    }
  }

  const levels: string[][] = [];
  let current = [...relevantNodes].filter((id) => (inDegree.get(id) ?? 0) === 0);

  while (current.length > 0) {
    levels.push(current);
    const next: string[] = [];
    for (const nodeId of current) {
      for (const neighbor of adjacency.get(nodeId) ?? []) {
        const deg = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, deg);
        if (deg === 0) next.push(neighbor);
      }
    }
    current = next;
  }

  return levels;
}

export function isExecutableNode(type: string): boolean {
  return type === "crop-image" || type === "gemini";
}

export function getNodeOutputKey(node: Node<WorkflowNodeData>): string {
  switch (node.type) {
    case "request-inputs":
      return "fields";
    case "crop-image":
      return "output-image";
    case "gemini":
      return "response";
    case "response":
      return "result";
    default:
      return "output";
  }
}

export function formatNodeOutputs(
  node: Node<WorkflowNodeData>,
  rawOutputs: Record<string, unknown>
): Record<string, unknown> {
  switch (node.type) {
    case "request-inputs": {
      const outputs: Record<string, unknown> = {};
      const fields = (node.data as RequestInputsData).fields;
      for (const field of fields) {
        outputs[field.name] = rawOutputs[field.name];
      }
      return outputs;
    }
    case "crop-image":
      return { "output-image": rawOutputs.outputImage };
    case "gemini":
      return { response: rawOutputs.response };
    case "response":
      return { result: rawOutputs.result };
    default:
      return rawOutputs;
  }
}

export function addFieldToRequestInputs(
  fields: InputField[]
): { fields: InputField[]; fieldName: string } {
  const textCount = fields.filter((f) => f.type === "text_field").length;
  const imageCount = fields.filter((f) => f.type === "image_field").length;
  const isImage = imageCount <= textCount;
  const name = isImage
    ? imageCount === 0
      ? "image_field"
      : `image_field_${imageCount + 1}`
    : textCount === 0
      ? "text_field"
      : `text_field_${textCount + 1}`;

  const newField: InputField = {
    id: `field-${Date.now()}`,
    name,
    type: isImage ? "image_field" : "text_field",
    value: isImage ? undefined : "",
    imageUrl: isImage ? "" : undefined,
  };

  return { fields: [...fields, newField], fieldName: name };
}
