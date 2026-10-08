"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronRight, ChevronDown, FileText, Folder } from "lucide-react";
import { Input } from "@arco-design/web-react";
import { DocTreeNode } from "@/lib/dataStore";

interface DocSidebarProps {
  productCode: string;
  tree: DocTreeNode[];
  currentDocSlug?: string;
  onOpenSearch?: () => void;
}

export default function DocSidebar({
  productCode,
  tree,
  currentDocSlug,
  onOpenSearch,
}: DocSidebarProps) {
  const [filterText, setFilterText] = useState("");
  // Default expanded folders
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    "group-entry": true,
    "group-invoke": true,
    "folder-multimodal": true,
  });

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const renderNode = (node: DocTreeNode, depth: number = 0) => {
    const isFolder = node.type === "folder";
    const isExpanded = !!expandedNodes[node.id];
    const isCurrent = currentDocSlug === node.slug;

    // Filter matching
    if (
      filterText &&
      !node.title.toLowerCase().includes(filterText.toLowerCase())
    ) {
      if (
        !node.children ||
        !node.children.some((c) =>
          c.title.toLowerCase().includes(filterText.toLowerCase())
        )
      ) {
        return null;
      }
    }

    if (isFolder) {
      return (
        <div key={node.id} className="select-none">
          <div
            onClick={() => toggleExpand(node.id)}
            style={{ paddingLeft: `${depth * 12 + 12}px` }}
            className={`flex items-center justify-between py-1.5 pr-3 text-xs text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md cursor-pointer font-medium transition-colors ${
              depth === 0 ? "text-gray-900 font-semibold mt-2" : ""
            }`}
          >
            <span className="truncate">{node.title}</span>
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            )}
          </div>

          {isExpanded && node.children && (
            <div className="space-y-0.5 mt-0.5">
              {node.children.map((child) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // Leaf Document Node
    return (
      <Link
        key={node.id}
        href={`/docs/${productCode}/${node.slug}`}
        style={{ paddingLeft: `${depth * 12 + 16}px` }}
        className={`flex items-center py-1.5 pr-3 text-xs rounded-md transition-all relative ${
          isCurrent
            ? "bg-blue-50/80 text-blue-600 font-medium before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-4 before:bg-blue-600 before:rounded-r"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
        }`}
      >
        <span className="truncate">{node.title}</span>
        {node.status === "draft" && (
          <span className="ml-auto text-[10px] px-1 py-0.2 bg-amber-50 text-amber-600 rounded border border-amber-200">
            草稿
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside className="w-64 border-r border-gray-200 bg-white flex flex-col shrink-0 h-[calc(100vh-3.5rem)] sticky top-14">
      {/* Quick Search Input */}
      <div className="p-3 border-b border-gray-100">
        <Input.Search
          size="small"
          placeholder="请输入 ⌘ K"
          allowClear
          value={filterText}
          onChange={setFilterText}
        />
      </div>

      {/* Document Tree Navigation */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {tree.map((node) => renderNode(node, 0))}
      </div>

      {/* Bottom Switcher / Admin shortcut */}
      <div className="p-3 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between text-xs text-gray-500">
        <span>中广云方舟文档库</span>
        <Link
          href={`/admin?product=${productCode}`}
          className="text-blue-600 hover:underline font-medium"
        >
          后台编辑
        </Link>
      </div>
    </aside>
  );
}
