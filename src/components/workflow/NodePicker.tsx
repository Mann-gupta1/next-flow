"use client";

import { useState, useMemo } from "react";
import { Plus, Search, Crop, Bot, ImageIcon, Video, Music, Box } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkflowStore } from "@/store/workflow-store";
import { DEFAULT_GEMINI_MODEL } from "@/lib/types";

const CATEGORIES = [
  { id: "recent", label: "Recent", icon: Box },
  { id: "image", label: "Image", icon: ImageIcon },
  { id: "video", label: "Video", icon: Video },
  { id: "audio", label: "Audio", icon: Music },
  { id: "others", label: "Others", icon: Box },
] as const;

type NodeTypeEntry = {
  id: string;
  label: string;
  description: string;
  icon: typeof Crop;
  category: string;
};

const NODE_TYPES: NodeTypeEntry[] = [
  {
    id: "crop-image",
    label: "Crop Image",
    description: "Crop an image with FFmpeg",
    icon: Crop,
    category: "image",
  },
  {
    id: "gemini",
    label: "Gemini 3.1 Pro",
    description: "Generate text with Google Gemini",
    icon: Bot,
    category: "others",
  },
];

interface NodePickerProps {
  onAddNode: (type: string, label: string) => void;
}

export function NodePicker({ onAddNode }: NodePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("recent");
  const [recentNodes, setRecentNodes] = useState<string[]>([]);

  const filteredNodes = useMemo(() => {
    let nodes = NODE_TYPES;
    if (category === "recent") {
      nodes = NODE_TYPES.filter((n) => recentNodes.includes(n.id));
      if (nodes.length === 0) nodes = NODE_TYPES;
    } else {
      nodes = NODE_TYPES.filter((n) => n.category === category);
    }
    if (search) {
      const q = search.toLowerCase();
      nodes = nodes.filter(
        (n) =>
          n.label.toLowerCase().includes(q) ||
          n.description.toLowerCase().includes(q)
      );
    }
    return nodes;
  }, [category, search, recentNodes]);

  const handleSelect = (nodeType: NodeTypeEntry) => {
    const count =
      useWorkflowStore
        .getState()
        .nodes.filter((n) => n.type === nodeType.id).length + 1;
    const label =
      nodeType.id === "gemini"
        ? `Gemini 3.1 Pro #${count}`
        : `Crop Image #${count}`;

    onAddNode(nodeType.id, label);
    setRecentNodes((prev) => [
      nodeType.id,
      ...prev.filter((id) => id !== nodeType.id),
    ].slice(0, 5));
    setOpen(false);
    setSearch("");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "fixed bottom-8 left-1/2 -translate-x-1/2 z-50",
          "flex items-center justify-center w-12 h-12 rounded-full",
          "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/30",
          "transition-all duration-200 hover:scale-105 active:scale-95"
        )}
      >
        <Plus className={cn("w-6 h-6 transition-transform", open && "rotate-45")} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[420px] max-h-[480px] rounded-2xl border border-white/10 bg-[#12121a]/98 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search nodes..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white/90 placeholder:text-white/40 focus:outline-none focus:border-violet-500/50"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex border-b border-white/10">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    "flex-1 px-2 py-2.5 text-[11px] font-medium transition-colors",
                    category === cat.id
                      ? "text-violet-400 border-b-2 border-violet-500"
                      : "text-white/40 hover:text-white/70"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="p-2 max-h-[300px] overflow-y-auto">
              {filteredNodes.length === 0 ? (
                <p className="text-center text-sm text-white/40 py-8">No nodes found</p>
              ) : (
                filteredNodes.map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => handleSelect(node)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left group"
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-500/10 text-violet-400 group-hover:bg-violet-500/20 transition-colors">
                      <node.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white/90">{node.label}</p>
                      <p className="text-xs text-white/40">{node.description}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

export function createNodeFromType(
  type: string,
  label: string,
  position: { x: number; y: number }
) {
  const id = `${type}-${Date.now()}`;

  if (type === "crop-image") {
    return {
      id,
      type: "crop-image",
      position,
      data: {
        label,
        positionX: 0,
        positionY: 0,
        width: 100,
        height: 100,
      },
    };
  }

  return {
    id,
    type: "gemini",
    position,
    data: {
      label,
      model: DEFAULT_GEMINI_MODEL,
      systemPrompt: "",
      prompt: "",
    },
  };
}
