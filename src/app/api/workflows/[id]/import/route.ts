import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { importWorkflowSchema } from "@/lib/schemas";

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

  const body = await request.json();
  const parsed = importWorkflowSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.workflow.update({
    where: { id },
    data: {
      name: parsed.data.name ?? workflow.name,
      nodes: parsed.data.nodes as object[],
      edges: parsed.data.edges as object[],
      viewport: (parsed.data.viewport ?? workflow.viewport ?? undefined) as object | undefined,
    },
  });

  return NextResponse.json(updated);
}
