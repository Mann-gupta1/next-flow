import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

  // Generate copy name
  const copyName = `${workflow.name} (Copy)`;

  const clonedWorkflow = await prisma.workflow.create({
    data: {
      userId,
      name: copyName,
      nodes: workflow.nodes as object[],
      edges: workflow.edges as object[],
      viewport: workflow.viewport ? (workflow.viewport as object) : { x: 0, y: 0, zoom: 0.8 },
    },
  });

  return NextResponse.json(clonedWorkflow, { status: 201 });
}
