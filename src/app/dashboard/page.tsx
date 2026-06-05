import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DashboardContent } from "@/components/dashboard/DashboardContent";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

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

  return (
    <DashboardContent
      initialWorkflows={workflows.map((w) => ({
        ...w,
        updatedAt: w.updatedAt.toISOString(),
        createdAt: w.createdAt.toISOString(),
      }))}
    />
  );
}
