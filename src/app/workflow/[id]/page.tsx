import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WorkflowCanvas } from "@/components/workflow/WorkflowCanvas";
import type { WorkflowNodeData } from "@/lib/types";
import type { Edge, Node } from "@xyflow/react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkflowPage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;
  const workflow = await prisma.workflow.findFirst({
    where: { id, userId },
  });

  if (!workflow) notFound();

  const nodes = workflow.nodes as unknown as Node<WorkflowNodeData>[];
  const edges = workflow.edges as unknown as Edge[];
  const viewport = workflow.viewport as unknown as
    | { x: number; y: number; zoom: number }
    | undefined;

  return (
    <WorkflowCanvas
      workflowId={workflow.id}
      workflowName={workflow.name}
      initialNodes={nodes}
      initialEdges={edges}
      initialViewport={viewport}
    />
  );
}
