"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import {
  MessageSquare,
  Folder,
  Library,
  GitFork,
  Cpu,
  BookOpen,
  Settings,
  Gift,
  ChevronDown,
  Layout,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface SidebarProps {
  activeItem?: string;
  onCreateWorkflow?: () => void;
  creating?: boolean;
}

export function Sidebar({ activeItem = "Flow", onCreateWorkflow, creating = false }: SidebarProps) {
  const { user } = useUser();
  const router = useRouter();

  const navItems = [
    { name: "Tasks", icon: MessageSquare, href: "/dashboard" },
    { name: "Projects", icon: Folder, href: "/dashboard" },
    { name: "Library", icon: Library, href: "/dashboard" },
    { name: "Flow", icon: GitFork, href: "/dashboard" },
    { name: "Nodes", icon: Cpu, href: "/dashboard" },
    { name: "API / MCP", icon: BookOpen, href: "/dashboard" },
  ];

  const handleNewTaskClick = () => {
    if (onCreateWorkflow) {
      onCreateWorkflow();
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="w-[260px] bg-[#fafafa] border-r border-neutral-200 flex flex-col h-full shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-4 flex items-center justify-between border-b border-neutral-200">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-black flex items-center justify-center font-extrabold text-white text-xs">
            M
          </div>
          <span className="text-base font-bold tracking-tight text-neutral-900">
            Nextflow
          </span>
        </div>
        <button className="text-neutral-400 hover:text-neutral-700 p-1 rounded hover:bg-neutral-100 transition-colors cursor-pointer">
          <Layout className="w-4 h-4" />
        </button>
      </div>

      {/* Action Button */}
      <div className="p-4">
        <button
          onClick={handleNewTaskClick}
          disabled={creating}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-neutral-200 text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50 hover:border-neutral-300 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
        >
          <Plus className="w-4 h-4 text-neutral-500" />
          <span>New task</span>
        </button>
      </div>

      {/* Search tasks */}
      <div className="px-4 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search tasks"
            className="w-full bg-white border border-neutral-200 rounded-xl py-2 pl-9 pr-4 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-black transition-all"
          />
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.name.toLowerCase() === activeItem.toLowerCase();
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-black text-white border border-black shadow-sm"
                  : "text-neutral-600 border border-transparent hover:bg-neutral-100 hover:text-neutral-900"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-neutral-400"}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}

        <div className="pt-6 pb-2 text-center">
          <span className="text-xs text-neutral-400 font-medium">No tasks yet</span>
        </div>
      </nav>

      {/* Footer Section */}
      <div className="p-4 border-t border-neutral-200 space-y-4">
        {/* Settings button */}
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-all"
        >
          <Settings className="w-4 h-4 text-neutral-500" />
          <span>Settings</span>
        </Link>

        {/* User profile details */}
        <div className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-neutral-100 transition-all cursor-pointer border border-transparent hover:border-neutral-200">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-8 h-8",
              },
            }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-neutral-800 truncate">
              {user?.fullName || "Mann Gupta"}
            </p>
            <p className="text-[10px] text-neutral-500 truncate">
              {user?.primaryEmailAddress?.emailAddress || "mann@vizuara.com"}
            </p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
        </div>
      </div>
    </div>
  );
}
