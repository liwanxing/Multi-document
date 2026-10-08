"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Modal, Pagination, Spin, Empty } from "@arco-design/web-react";
import { IconClose } from "@arco-design/web-react/icon";
import { Compass } from "lucide-react";
import type { Project, ProjectProduct } from "@/lib/dataStore";

export interface SearchResultItem {
  id: string;
  type: "product" | "doc";
  title: string;
  description: string;
  snippet: string;
  breadcrumb: string;
  href: string;
  productName: string;
  projectName: string;
}

export interface HotDocItem {
  id?: string;
  title: string;
  productName: string;
  displayName: string;
  href?: string;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project;
  product?: ProjectProduct;
  initialQuery?: string;
}

function SparkleSearchIcon({ className = "w-4 h-4 text-gray-500" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8.5 14A5.5 5.5 0 1 0 8.5 3a5.5 5.5 0 0 0 0 11zM12.5 12.5L16.5 16.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.8 5.2l.5 1.1 1.1.5-1.1.5-.5 1.1-.5-1.1-1.1-.5 1.1-.5.5-1.1z"
        fill="currentColor"
      />
    </svg>
  );
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || !text) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <span key={i} className="text-blue-600 font-medium">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

export default function GlobalSearchModal({
  isOpen,
  onClose,
  initialQuery = "",
}: GlobalSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [hotDocs, setHotDocs] = useState<HotDocItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global CMD+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Click outside modal to close reliably
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const modalEl = document.querySelector(".global-search-arco-modal .arco-modal");
      if (modalEl && !modalEl.contains(e.target as Node)) {
        onClose();
      }
    };

    const timer = setTimeout(() => {
      window.addEventListener("mousedown", handleOutsideClick);
    }, 50);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen, onClose]);

  // Focus input and load hotDocs when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
      fetchHotDocs();
    } else {
      setQuery("");
      setResults([]);
      setPage(1);
    }
  }, [isOpen]);

  const fetchHotDocs = async () => {
    try {
      const res = await fetch("/api/search");
      const json = await res.json();
      if (json.code === 0 && json.data.hotDocs) {
        setHotDocs(json.data.hotDocs);
      }
    } catch (e) {
      console.error("Failed to load hot docs", e);
    }
  };

  // Debounced search query
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setTotal(0);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}&page=${page}&pageSize=${pageSize}`,
        );
        const json = await res.json();
        if (json.code === 0) {
          setResults(json.data.items || []);
          setTotal(json.data.total || 0);
          if (json.data.hotDocs?.length) {
            setHotDocs(json.data.hotDocs);
          }
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query, page, pageSize]);

  const handleSelectHotDoc = (item: HotDocItem) => {
    if (item.href) {
      router.push(item.href);
      onClose();
    } else {
      setQuery(item.title);
      setPage(1);
    }
  };

  const handleSelectResult = (item: SearchResultItem) => {
    router.push(item.href);
    onClose();
  };

  return (
    <Modal
      visible={isOpen}
      onCancel={onClose}
      maskClosable={true}
      mask={true}
      escToExit={true}
      footer={null}
      closable={false}
      alignCenter={false}
      unmountOnExit
      style={{
        width: 720,
        maxWidth: "calc(100vw - 32px)",
        top: 80,
        borderRadius: 12,
        padding: 0,
        overflow: "hidden",
      }}
      wrapClassName="global-search-arco-modal"
    >
      <div className="flex flex-col bg-white">
        {/* Search Header Bar */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <SparkleSearchIcon className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            className="w-full text-base text-gray-800 placeholder-gray-400 bg-transparent border-none outline-none"
            placeholder="请输入关键词进行搜索"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults([]);
                setTotal(0);
                inputRef.current?.focus();
              }}
              className="text-gray-400 hover:text-gray-600 p-1"
              aria-label="清空搜索"
            >
              <IconClose />
            </button>
          )}
          <kbd className="px-2 py-0.5 text-xs text-gray-400 bg-gray-100 rounded border border-gray-200 select-none">
            ESC
          </kbd>
        </div>

        {/* Modal Content Body */}
        <div className="overflow-y-auto px-6 py-4 min-h-[380px] max-h-[540px]">
          {/* 1. Empty state: Hot Documents (Screenshot 3) */}
          {!query && (
            <div className="py-2">
              <div className="flex items-center text-[13px] text-gray-500 font-medium mb-3">
                <Compass className="w-4 h-4 mr-2 text-gray-400" />
                <span>热门产品文档</span>
              </div>
              <div className="flex flex-col gap-1">
                {hotDocs.map((item, idx) => {
                  const rankNumber = idx + 1;
                  const rankColor =
                    rankNumber === 1
                      ? "text-[#f53f3f]"
                      : rankNumber === 2
                        ? "text-[#ff7d00]"
                        : rankNumber === 3
                          ? "text-[#ff9a2e]"
                          : "text-[#86909c]";

                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelectHotDoc(item)}
                      className="flex items-center px-3 py-2 rounded-md hover:bg-gray-50 cursor-pointer transition-colors group"
                    >
                      <span className={`w-6 text-sm font-semibold shrink-0 ${rankColor}`}>
                        {rankNumber}
                      </span>
                      <span className="text-sm text-gray-800 group-hover:text-blue-600 transition-colors">
                        {item.displayName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Loading state */}
          {query && loading && (
            <div className="py-20 flex justify-center items-center">
              <Spin tip="正在搜索中..." />
            </div>
          )}

          {/* 3. Empty Search Results */}
          {query && !loading && results.length === 0 && (
            <div className="py-16">
              <Empty description={`未找到与 "${query}" 相关的产品或文档`} />
            </div>
          )}

          {/* 4. Search Results list (Screenshot 4) */}
          {query && !loading && results.length > 0 && (
            <div>
              <div className="flex flex-col">
                {results.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectResult(item)}
                    className="py-3 px-3.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group mb-1.5"
                  >
                    <h3 className="text-[15px] font-medium text-gray-900 group-hover:text-blue-600 mb-1 leading-snug">
                      {highlightMatch(item.title, query)}
                    </h3>
                    <p className="text-[13px] text-gray-600 leading-relaxed mb-1 line-clamp-2">
                      {highlightMatch(item.snippet, query)}
                    </p>
                    <div className="text-xs text-gray-400">
                      {item.breadcrumb}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination matching Screenshot 4 */}
              <div className="mt-4 pt-2 pb-2 flex justify-end items-center">
                <Pagination
                  size="small"
                  total={total}
                  pageSize={pageSize}
                  current={page}
                  onChange={(p) => setPage(p)}
                  showTotal={(tot) => `共 ${tot} 项`}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
