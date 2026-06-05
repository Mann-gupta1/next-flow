import type { Edge, Node, Viewport } from "@xyflow/react";

export type PortDataType = "text" | "image" | "audio" | "file" | "any";

export type NodeType =
  | "request-inputs"
  | "crop-image"
  | "gemini"
  | "response";

export interface InputField {
  id: string;
  name: string;
  type: "text_field" | "image_field";
  value?: string;
  imageUrl?: string;
  imageName?: string;
}

export interface RequestInputsData extends Record<string, unknown> {
  label: string;
  fields: InputField[];
  outputs?: Record<string, unknown>;
}

export interface CropImageData extends Record<string, unknown> {
  label: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  inputImage?: string;
  inputImageConnected?: boolean;
  outputImage?: string;
  isRunning?: boolean;
  lastError?: string;
}

export interface GeminiData extends Record<string, unknown> {
  label: string;
  model: string;
  systemPrompt?: string;
  prompt?: string;
  promptConnected?: boolean;
  systemPromptConnected?: boolean;
  imageInput?: string | string[];
  imageConnected?: boolean;
  audioInput?: string;
  audioConnected?: boolean;
  fileInput?: string;
  fileConnected?: boolean;
  settingsOpen?: boolean;
  response?: string;
  isRunning?: boolean;
  lastError?: string;
}

export interface ResponseData extends Record<string, unknown> {
  label: string;
  result?: string;
  resultConnected?: boolean;
}

export type WorkflowNodeData =
  | RequestInputsData
  | CropImageData
  | GeminiData
  | ResponseData;

export type WorkflowNode = Node<WorkflowNodeData>;
export type WorkflowEdge = Edge;
export type WorkflowViewport = Viewport;

export interface WorkflowExport {
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport?: WorkflowViewport;
}

export interface NodeExecutionResult {
  nodeId: string;
  status: "success" | "failed" | "skipped";
  outputs?: Record<string, unknown>;
  error?: string;
  duration?: number;
}

export interface PortDefinition {
  id: string;
  label: string;
  dataType: PortDataType;
}

export const GEMINI_MODELS = [
  { id: "gemini-2.5-pro", label: "Gemini 3.1 Pro" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
] as const;

export const DEFAULT_GEMINI_MODEL = "gemini-2.5-pro";
