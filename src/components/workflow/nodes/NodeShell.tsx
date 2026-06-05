"use client";

import { Handle, Position, type HandleProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface NodeShellProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  isRunning?: boolean;
  className?: string;
  handles?: {
    inputs?: Array<{ id: string; label: string; top?: string }>;
    outputs?: Array<{ id: string; label: string; top?: string }>;
  };
}

export function NodeHandle({
  type,
  position,
  id,
  className,
  ...props
}: HandleProps) {
  return (
    <Handle
      type={type}
      position={position}
      id={id}
      className={cn(
        "!w-3 !h-3 !border-2 !border-white !bg-black hover:!bg-neutral-800 transition-colors",
        className
      )}
      {...props}
    />
  );
}

export function NodeShell({
  title,
  icon,
  children,
  isRunning,
  className,
  handles,
}: NodeShellProps) {
  return (
    <div
      className={cn(
        "min-w-[280px] rounded-xl border border-neutral-200 bg-white/95 backdrop-blur-md shadow-lg",
        isRunning && "node-running-glow",
        className
      )}
    >
      <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-3">
        {icon && <div className="text-neutral-700">{icon}</div>}
        <h3 className="text-sm font-medium text-neutral-800">{title}</h3>
      </div>
      <div className="px-4 py-3 space-y-3">{children}</div>

      {handles?.inputs?.map((handle) => (
        <div key={handle.id} className="absolute left-0" style={{ top: handle.top ?? "50%" }}>
          <NodeHandle type="target" position={Position.Left} id={handle.id} />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 whitespace-nowrap font-medium">
            {handle.label}
          </span>
        </div>
      ))}

      {handles?.outputs?.map((handle) => (
        <div key={handle.id} className="absolute right-0" style={{ top: handle.top ?? "50%" }}>
          <NodeHandle type="source" position={Position.Right} id={handle.id} />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 whitespace-nowrap font-medium">
            {handle.label}
          </span>
        </div>
      ))}
    </div>
  );
}
