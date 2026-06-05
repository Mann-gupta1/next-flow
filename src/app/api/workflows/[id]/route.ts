import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateWorkflowSchema } from "@/lib/schemas";

type RouteParams = { params: Promise<{ id: string }> };

async function getWorkflowForUser(id: string, userId: string) {
  return prisma.workflow.findFirst({
    where: { id, userId },
  });
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const workflow = await getWorkflowForUser(id, userId);
  if (!workflow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(workflow);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const workflow = await getWorkflowForUser(id, userId);
  if (!workflow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateWorkflowSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.workflow.update({
    where: { id },
    data: {
      ...(parsed.data.name && { name: parsed.data.name }),
      ...(parsed.data.nodes && { nodes: parsed.data.nodes as object[] }),
      ...(parsed.data.edges && { edges: parsed.data.edges as object[] }),
      ...(parsed.data.viewport && { viewport: parsed.data.viewport as object }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const workflow = await getWorkflowForUser(id, userId);
  if (!workflow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.workflow.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
