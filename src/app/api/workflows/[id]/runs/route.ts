import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
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

  const runs = await prisma.workflowRun.findMany({
    where: { workflowId: id, userId },
    orderBy: { startedAt: "desc" },
    include: {
      nodeExecutions: {
        orderBy: { startedAt: "asc" },
      },
    },
  });

  return NextResponse.json(runs);
}
