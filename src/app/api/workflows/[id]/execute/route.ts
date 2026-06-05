import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { Edge, Node } from "@xyflow/react";
import { prisma } from "@/lib/prisma";
import { executeWorkflowSchema } from "@/lib/schemas";
import { executeWorkflow } from "@/lib/execution/engine";
import type { WorkflowNodeData } from "@/lib/types";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const workflow = await prisma.workflow.findFirst({
    where: { id, userId },
  });

  if (!workflow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (workflow.status === "RUNNING") {
    return NextResponse.json({ error: "Workflow is already running" }, { status: 409 });
  }

  const body = await request.json();
  const parsed = executeWorkflowSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const nodes = workflow.nodes as unknown as Node<WorkflowNodeData>[];
  const edges = workflow.edges as unknown as Edge[];

  try {
    const result = await executeWorkflow({
      workflowId: id,
      userId,
      nodes,
      edges,
      scope: parsed.data.scope,
      targetNodeIds: parsed.data.nodeIds,
      geminiApiKey: parsed.data.geminiApiKey,
    });

    // Update node data with outputs
    const updatedNodes = nodes.map((node) => {
      const nodeOutputs = result.outputs[node.id];
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

    await prisma.workflow.update({
      where: { id },
      data: { nodes: updatedNodes as object[] },
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Execution failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
