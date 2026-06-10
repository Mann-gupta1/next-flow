import { tasks, runs } from "@trigger.dev/sdk/v3";
import type { Edge, Node } from "@xyflow/react";
import type { cropImageTask } from "@/trigger/crop-image";
import type { geminiTask } from "@/trigger/gemini";
import { prisma } from "@/lib/prisma";
import type { RunScope, RunStatus } from "@/generated/prisma/client";
import type { WorkflowNodeData } from "../types";
import {
  buildExecutionLevels,
  formatNodeOutputs,
  isExecutableNode,
  resolveNodeInputs,
  resolveRequestInputs,
  type ResolvedOutputs,
} from "./resolver";

async function executeTaskAndPoll(taskName: string, payload: any) {
  const handle = await tasks.trigger(taskName, payload);
  while (true) {
    const run = await runs.retrieve(handle.id);
    const status = run.status as string;
    if (status === "COMPLETED" || status === "SUCCESS") {
      return run.output;
    }
    if (
      status === "FAILED" ||
      status === "CANCELED" ||
      status === "CRASHED" ||
      status === "SYSTEM_FAILURE"
    ) {
      throw new Error((run as any).error?.message || `Task execution failed with status: ${run.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
}

interface ExecuteOptions {
  workflowId: string;
  userId: string;
  nodes: Node<WorkflowNodeData>[];
  edges: Edge[];
  scope: RunScope;
  targetNodeIds?: string[];
  geminiApiKey?: string;
}

interface NodeRunRecord {
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  status: RunStatus;
  inputs?: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  error?: string;
  duration?: number;
}

export async function executeWorkflow(options: ExecuteOptions) {
  const { workflowId, userId, nodes, edges, scope, targetNodeIds, geminiApiKey } = options;

  const executableIds =
    scope === "FULL"
      ? nodes.filter((n) => isExecutableNode(n.type ?? "")).map((n) => n.id)
      : (targetNodeIds ?? []);

  const run = await prisma.workflowRun.create({
    data: {
      workflowId,
      userId,
      scope,
      status: "RUNNING",
    },
  });

  await prisma.workflow.update({
    where: { id: workflowId },
    data: { status: "RUNNING" },
  });

  const startTime = Date.now();
  const outputs: ResolvedOutputs = {};
  const nodeRecords: NodeRunRecord[] = [];

  // Resolve request-inputs first
  for (const node of nodes) {
    if (node.type === "request-inputs") {
      const nodeStart = Date.now();
      const inputs = resolveRequestInputs(node.data as never);
      outputs[node.id] = inputs;

      const execution = await prisma.nodeExecution.create({
        data: {
          runId: run.id,
          nodeId: node.id,
          nodeType: node.type,
          nodeLabel: (node.data as { label?: string }).label ?? "Request Inputs",
          status: "SUCCESS",
          inputs: inputs as object,
          outputs: inputs as object,
          duration: Date.now() - nodeStart,
          startedAt: new Date(nodeStart),
          completedAt: new Date(),
        },
      });

      nodeRecords.push({
        nodeId: node.id,
        nodeType: node.type,
        nodeLabel: (node.data as { label?: string }).label ?? "Request Inputs",
        status: "SUCCESS",
        inputs,
        outputs: inputs,
        duration: execution.duration ?? 0,
      });
    }
  }

  const levels = buildExecutionLevels(
    nodes,
    edges,
    executableIds,
    scope === "FULL"
  );
  let hasFailure = false;

  for (const level of levels) {
    const levelNodes = level.filter((id) => executableIds.includes(id));
    if (levelNodes.length === 0) continue;

    const levelPromises = levelNodes.map(async (nodeId) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node || !isExecutableNode(node.type ?? "")) return;

      const nodeStart = Date.now();
      const inputs = resolveNodeInputs(node, edges, outputs, nodes);
      const label = (node.data as { label?: string }).label ?? node.type ?? "Node";

      const execution = await prisma.nodeExecution.create({
        data: {
          runId: run.id,
          nodeId: node.id,
          nodeType: node.type ?? "unknown",
          nodeLabel: label,
          status: "RUNNING",
          inputs: inputs as object,
          startedAt: new Date(nodeStart),
        },
      });

      try {
        let result: Record<string, unknown>;

        if (node.type === "crop-image") {
          if (!inputs.imageUrl) {
            throw new Error("Input image is required");
          }
          const output = await executeTaskAndPoll("crop-image", {
            imageUrl: inputs.imageUrl as string,
            positionX: inputs.positionX as number,
            positionY: inputs.positionY as number,
            width: inputs.width as number,
            height: inputs.height as number,
          });
          result = output as Record<string, unknown>;
        } else if (node.type === "gemini") {
          if (!inputs.prompt) {
            throw new Error("Prompt is required");
          }
          const output = await executeTaskAndPoll("gemini-execute", {
            model: inputs.model as string,
            prompt: inputs.prompt as string,
            systemPrompt: (inputs.systemPrompt as string) || undefined,
            imageUrls: (inputs.imageUrls as string[])?.length
              ? (inputs.imageUrls as string[])
              : undefined,
            audioUrl: inputs.audioUrl as string | undefined,
            fileUrl: inputs.fileUrl as string | undefined,
            geminiApiKey,
          });
          result = output as Record<string, unknown>;
        } else {
          return;
        }

        const formatted = formatNodeOutputs(node, result);
        outputs[node.id] = formatted;
        const duration = Date.now() - nodeStart;

        await prisma.nodeExecution.update({
          where: { id: execution.id },
          data: {
            status: "SUCCESS",
            outputs: formatted as object,
            duration,
            completedAt: new Date(),
          },
        });

        nodeRecords.push({
          nodeId: node.id,
          nodeType: node.type ?? "",
          nodeLabel: label,
          status: "SUCCESS",
          inputs,
          outputs: formatted,
          duration,
        });
      } catch (error) {
        hasFailure = true;
        const message = error instanceof Error ? error.message : "Unknown error";
        const duration = Date.now() - nodeStart;

        await prisma.nodeExecution.update({
          where: { id: execution.id },
          data: {
            status: "FAILED",
            error: message,
            duration,
            completedAt: new Date(),
          },
        });

        nodeRecords.push({
          nodeId: node.id,
          nodeType: node.type ?? "",
          nodeLabel: label,
          status: "FAILED",
          inputs,
          error: message,
          duration,
        });
      }
    });

    await Promise.all(levelPromises);
  }

  // Resolve response node on full workflow runs
  if (scope === "FULL") for (const node of nodes) {
    if (node.type === "response") {
      const nodeStart = Date.now();
      const inputs = resolveNodeInputs(node, edges, outputs, nodes);
      const formatted = formatNodeOutputs(node, inputs);
      outputs[node.id] = formatted;

      await prisma.nodeExecution.create({
        data: {
          runId: run.id,
          nodeId: node.id,
          nodeType: node.type,
          nodeLabel: (node.data as { label?: string }).label ?? "Response",
          status: "SUCCESS",
          inputs: inputs as object,
          outputs: formatted as object,
          duration: Date.now() - nodeStart,
          startedAt: new Date(nodeStart),
          completedAt: new Date(),
        },
      });

      nodeRecords.push({
        nodeId: node.id,
        nodeType: node.type,
        nodeLabel: (node.data as { label?: string }).label ?? "Response",
        status: "SUCCESS",
        inputs,
        outputs: formatted,
        duration: Date.now() - nodeStart,
      });
    }
  }

  const totalDuration = Date.now() - startTime;
  const successCount = nodeRecords.filter((r) => r.status === "SUCCESS").length;
  const failedCount = nodeRecords.filter((r) => r.status === "FAILED").length;

  let finalStatus: RunStatus = "SUCCESS";
  if (failedCount > 0 && successCount > 0) finalStatus = "PARTIAL";
  else if (failedCount > 0) finalStatus = "FAILED";

  await prisma.workflowRun.update({
    where: { id: run.id },
    data: {
      status: finalStatus,
      duration: totalDuration,
      completedAt: new Date(),
    },
  });

  // Update node data with outputs in the database
  const updatedNodes = nodes.map((node) => {
    const nodeOutputs = outputs[node.id];
    if (!nodeOutputs) return node;

    if (node.type === "crop-image") {
      return {
        ...node,
        data: {
          ...node.data,
          outputImage: nodeOutputs["output-image"] as string,
          isRunning: false,
          lastError: undefined,
        },
      };
    }
    if (node.type === "gemini") {
      return {
        ...node,
        data: {
          ...node.data,
          response: nodeOutputs.response as string,
          isRunning: false,
          lastError: undefined,
        },
      };
    }
    if (node.type === "response") {
      return {
        ...node,
        data: {
          ...node.data,
          result: nodeOutputs.result as string,
        },
      };
    }
    return node;
  });

  // For nodes that were in the execution scope but failed, make sure we clear running and set error
  for (const record of nodeRecords) {
    if (record.status === "FAILED") {
      const idx = updatedNodes.findIndex((n) => n.id === record.nodeId);
      if (idx !== -1) {
        updatedNodes[idx] = {
          ...updatedNodes[idx],
          data: {
            ...updatedNodes[idx].data,
            isRunning: false,
            lastError: record.error,
          },
        };
      }
    }
  }

  await prisma.workflow.update({
    where: { id: workflowId },
    data: {
      status: "IDLE",
      nodes: updatedNodes as object[],
    },
  });

  return {
    runId: run.id,
    status: finalStatus,
    duration: totalDuration,
    nodeRecords,
    outputs,
  };
}
