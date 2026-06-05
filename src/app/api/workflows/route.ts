import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createWorkflowSchema } from "@/lib/schemas";
import {
  createBlankWorkflowNodes,
  createSampleWorkflowEdges,
  createSampleWorkflowNodes,
} from "@/lib/sample-workflow";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workflows = await prisma.workflow.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      status: true,
      updatedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json(workflows);
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = createWorkflowSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const seedSample = parsed.data.seedSample ?? false;
  const nodes = seedSample ? createSampleWorkflowNodes() : createBlankWorkflowNodes();
  const edges = seedSample ? createSampleWorkflowEdges() : [];

  const workflow = await prisma.workflow.create({
    data: {
      userId,
      name: parsed.data.name ?? (seedSample ? "Marketing Workflow" : "Untitled Workflow"),
      nodes: nodes as object[],
      edges: edges as object[],
      viewport: { x: 0, y: 0, zoom: 0.8 },
    },
  });

  return NextResponse.json(workflow, { status: 201 });
}
