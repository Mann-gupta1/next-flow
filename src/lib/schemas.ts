import { z } from "zod";

export const inputFieldSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: z.enum(["text_field", "image_field"]),
  value: z.string().optional(),
  imageUrl: z.string().url().optional(),
  imageName: z.string().optional(),
});

export const workflowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  data: z.record(z.string(), z.unknown()),
});

export const workflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().nullable().optional(),
  targetHandle: z.string().nullable().optional(),
});

export const createWorkflowSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  seedSample: z.boolean().optional(),
});

export const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  nodes: z.array(workflowNodeSchema).optional(),
  edges: z.array(workflowEdgeSchema).optional(),
  viewport: z
    .object({
      x: z.number(),
      y: z.number(),
      zoom: z.number(),
    })
    .optional(),
});

export const executeWorkflowSchema = z.object({
  scope: z.enum(["SINGLE", "PARTIAL", "FULL"]),
  nodeIds: z.array(z.string()).optional(),
  geminiApiKey: z.string().optional(),
});

export const importWorkflowSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  nodes: z.array(workflowNodeSchema),
  edges: z.array(workflowEdgeSchema),
  viewport: z
    .object({
      x: z.number(),
      y: z.number(),
      zoom: z.number(),
    })
    .optional(),
});

export const cropImagePayloadSchema = z.object({
  imageUrl: z.string().url(),
  positionX: z.number().min(0).max(100),
  positionY: z.number().min(0).max(100),
  width: z.number().min(0).max(100),
  height: z.number().min(0).max(100),
});

export const geminiPayloadSchema = z.object({
  model: z.string(),
  prompt: z.string().min(1),
  systemPrompt: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
  audioUrl: z.string().url().optional(),
  fileUrl: z.string().url().optional(),
  geminiApiKey: z.string().optional(),
});
