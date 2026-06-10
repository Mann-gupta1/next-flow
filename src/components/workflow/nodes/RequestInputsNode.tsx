"use client";

import { memo, useCallback } from "react";
import { type NodeProps, Position } from "@xyflow/react";
import { FormInput, ImageIcon, Plus, Trash2, Upload } from "lucide-react";
import { NodeHandle, NodeShell } from "./NodeShell";
import { useWorkflowStore } from "@/store/workflow-store";
import type { InputField, RequestInputsData } from "@/lib/types";
import { addFieldToRequestInputs } from "@/lib/execution/resolver";
import { cn } from "@/lib/utils";

function TransloaditUploader({
  onUpload,
  fieldId,
  disabled,
}: {
  onUpload: (url: string, name: string) => void;
  fieldId: string;
  disabled?: boolean;
}) {
  const handleUpload = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/jpg,image/png,image/webp,image/gif";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const sigRes = await fetch("/api/transloadit/signature");
        if (!sigRes.ok) {
          const reader = new FileReader();
          reader.onload = () => onUpload(reader.result as string, file.name);
          reader.readAsDataURL(file);
          return;
        }
        const { params, signature } = await sigRes.json();
        const formData = new FormData();
        formData.append("params", params);
        formData.append("signature", signature);
        formData.append("file", file);

        const res = await fetch("https://api2.transloadit.com/assemblies", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        const url =
          data.results?.exported?.[0]?.url ??
          data.results?.[":original"]?.[0]?.url;
        if (url) onUpload(url, file.name);
      } catch {
        const reader = new FileReader();
        reader.onload = () => onUpload(reader.result as string, file.name);
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }, [onUpload]);

  return (
    <button
      type="button"
      onClick={handleUpload}
      disabled={disabled}
      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-dashed border-neutral-200 text-xs text-neutral-500 hover:border-black hover:text-black transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
      data-field={fieldId}
    >
      <Upload className="w-3.5 h-3.5" />
      Upload image
    </button>
  );
}

export const RequestInputsNode = memo(function RequestInputsNode({
  id,
  data,
}: NodeProps) {
  const nodeData = data as RequestInputsData;
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const pushHistory = useWorkflowStore((s) => s.pushHistory);

  const updateField = (fieldId: string, updates: Partial<InputField>) => {
    const fields = nodeData.fields.map((f) =>
      f.id === fieldId ? { ...f, ...updates } : f
    );
    updateNodeData(id, { fields });
  };

  const addField = () => {
    pushHistory();
    const { fields } = addFieldToRequestInputs(nodeData.fields);
    updateNodeData(id, { fields });
  };

  const removeField = (fieldId: string) => {
    if (nodeData.fields.length <= 1) return;
    pushHistory();
    updateNodeData(id, {
      fields: nodeData.fields.filter((f) => f.id !== fieldId),
    });
  };

  const outputHandles = nodeData.fields.map((field, i) => ({
    id: field.name,
    label: field.name,
    top: `${30 + i * 18}%`,
  }));

  return (
    <div className="relative">
      <NodeShell
        title={nodeData.label || "Request Inputs"}
        icon={<FormInput className="w-4 h-4" />}
      >
        <div className="space-y-4">
          {nodeData.fields.map((field) => (
            <div key={field.id} className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={field.name}
                  onChange={(e) => updateField(field.id, { name: e.target.value })}
                  disabled={!!nodeData.isReadOnly}
                  className="flex-1 bg-neutral-50 border border-neutral-200 rounded px-2 py-1 text-xs text-neutral-800 focus:outline-none focus:border-black disabled:opacity-50"
                />
                {nodeData.fields.length > 1 && !nodeData.isReadOnly && (
                  <button
                    type="button"
                    onClick={() => removeField(field.id)}
                    className="p-1 text-neutral-400 hover:text-red-600 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {field.type === "text_field" ? (
                <textarea
                  value={field.value ?? ""}
                  onChange={(e) => updateField(field.id, { value: e.target.value })}
                  disabled={!!nodeData.isReadOnly}
                  rows={3}
                  placeholder="Enter text..."
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-black resize-none disabled:opacity-50"
                />
              ) : (
                <div className="space-y-2">
                  {field.imageUrl ? (
                    <div className="relative rounded-lg overflow-hidden border border-neutral-200">
                      <img
                        src={field.imageUrl}
                        alt={field.imageName ?? "Preview"}
                        className="w-full h-24 object-cover"
                      />
                      {!nodeData.isReadOnly && (
                        <button
                          type="button"
                          onClick={() =>
                            updateField(field.id, { imageUrl: "", imageName: "" })
                          }
                          className="absolute top-1 right-1 p-1 bg-black/80 rounded text-white/80 hover:text-white hover:bg-black cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <TransloaditUploader
                      fieldId={field.id}
                      disabled={!!nodeData.isReadOnly}
                      onUpload={(url, name) =>
                        updateField(field.id, { imageUrl: url, imageName: name })
                      }
                    />
                  )}
                </div>
              )}
            </div>
          ))}

          {!nodeData.isReadOnly && (
            <button
              type="button"
              onClick={addField}
              className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-black transition-colors font-medium cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add field
            </button>
          )}
        </div>
      </NodeShell>

      {outputHandles.map((handle) => (
        <div
          key={handle.id}
          className="absolute right-0 translate-x-0"
          style={{ top: handle.top }}
        >
          <NodeHandle type="source" position={Position.Right} id={handle.id} />
        </div>
      ))}
    </div>
  );
});
