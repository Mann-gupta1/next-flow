"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[NextFlow] Dashboard error:", error);
  }, [error]);

  const isDatabaseError =
    error.message.includes("DATABASE_URL") ||
    error.message.includes("ECONNREFUSED") ||
    error.message.includes("Prisma");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#08080f] text-white px-6">
      <h1 className="text-2xl font-semibold mb-2">Dashboard unavailable</h1>
      <p className="text-white/50 text-sm text-center max-w-md mb-6">
        {isDatabaseError
          ? "Could not connect to the database. Ensure DATABASE_URL is set in .env and run npm run db:push, then restart the dev server."
          : "Something went wrong while loading your workflows."}
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm font-medium transition-colors"
        >
          Try again
        </button>
        <Link
          href="/sign-in"
          className="px-4 py-2 rounded-lg border border-white/10 text-sm text-white/70 hover:bg-white/5 transition-colors"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
