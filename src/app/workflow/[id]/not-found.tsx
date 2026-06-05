import Link from "next/link";

export default function WorkflowNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#08080f] text-white">
      <h1 className="text-2xl font-semibold mb-2">Workflow not found</h1>
      <p className="text-white/40 mb-6">
        This workflow does not exist or you do not have access.
      </p>
      <Link
        href="/dashboard"
        className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm font-medium transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
