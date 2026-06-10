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
    // Start executeWorkflow asynchronously in the background
    executeWorkflow({
      workflowId: id,
      userId,
      nodes,
      edges,
      scope: parsed.data.scope,
      targetNodeIds: parsed.data.nodeIds,
      geminiApiKey: parsed.data.geminiApiKey,
    }).catch((error) => {
      console.error("Workflow background execution failed:", error);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Execution failed to start";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
