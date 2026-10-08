"use client";

import { displayDateTime } from "@/lib/dates";
import {
  Modal,
  Input,
  Timeline,
  Tag,
  Button,
  Empty,
} from "@arco-design/web-react";
import { IconRight, IconHistory } from "@arco-design/web-react/icon";
import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { DocRevision } from "@/lib/dataStore";

const MarkdownRenderer = dynamic(() => import("./MarkdownRenderer"));

export default function UpdateTimeline({
  history,
  base,
}: {
  history: DocRevision[];
  base: string;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DocRevision | null>(null);

  const filtered = history.filter((e) =>
    (e.title + e.summary + e.changes.join(" "))
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <>
      <div className="timeline-controls flex items-center justify-between gap-4 mb-6">
        <Input.Search
          allowClear
          aria-label="搜索产品动态"
          value={query}
          onChange={setQuery}
          placeholder="搜索文档名称或更新内容"
          style={{ width: 350, maxWidth: "80%" }}
        />
        <span className="text-xs text-gray-500">{filtered.length} 条记录</span>
      </div>

      {filtered.length > 0 ? (
        <div className="py-4">
          <Timeline mode="left" className="arco-doc-timeline">
            {filtered.map((entry) => {
              const dateStr = displayDateTime(entry.publishedAt).slice(0, 10);
              const timeStr = entry.publishedAt.includes("T")
                ? new Date(entry.publishedAt).toLocaleTimeString("zh-CN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Asia/Shanghai",
                  })
                : "历史版本";

              const typeText = entry.baseline
                ? "已有版本"
                : entry.changes.includes("首次发布")
                  ? "首次发布"
                  : entry.changes.includes("关联文档")
                    ? "关联文档"
                    : "文档更新";

              const typeColor = entry.baseline
                ? "gray"
                : typeText === "首次发布"
                  ? "green"
                  : "arcoblue";

              return (
                <Timeline.Item
                  key={entry.id}
                  label={
                    <div className="text-right pr-4 font-mono">
                      <div className="text-sm font-semibold text-gray-800">
                        {dateStr}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {timeStr}
                      </div>
                    </div>
                  }
                >
                  <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Tag size="small" color={typeColor}>
                        {typeText}
                      </Tag>
                      <Tag size="small" color="blue" bordered>
                        v{entry.version}
                      </Tag>
                    </div>

                    <h2 className="text-base font-semibold text-gray-900 m-0 mb-1.5">
                      {entry.title}
                    </h2>

                    <p className="text-xs text-gray-600 leading-relaxed m-0 mb-3">
                      {entry.summary}
                    </p>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {entry.changes.map((change) => (
                        <Tag key={change} size="small" color="gray">
                          {change}
                        </Tag>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-50 text-xs">
                      <Button
                        type="text"
                        size="small"
                        onClick={() => setSelected(entry)}
                      >
                        查看当时版本
                      </Button>
                      <Link
                        href={`${base}/docs/${encodeURIComponent(entry.docId)}`}
                        className="text-blue-600 hover:text-blue-700 flex items-center gap-0.5 no-underline font-medium"
                      >
                        阅读最新文档
                        <IconRight style={{ fontSize: 12 }} />
                      </Link>
                    </div>
                  </div>
                </Timeline.Item>
              );
            })}
          </Timeline>
        </div>
      ) : (
        <div className="py-16">
          <Empty
            icon={<IconHistory style={{ fontSize: 36, color: "#86909c" }} />}
            description={
              query
                ? "没有匹配的更新记录。"
                : "发布文档后会自动生成产品动态。"
            }
          />
        </div>
      )}

      <Modal
        visible={!!selected}
        title={
          selected
            ? `${selected.title} · v${selected.version} · 历史快照`
            : ""
        }
        onCancel={() => setSelected(null)}
        footer={
          <div className="flex justify-end">
            <Button onClick={() => setSelected(null)}>关闭快照</Button>
          </div>
        }
        unmountOnExit
        maskClosable={false}
        className="public-revision-modal workspace-arco-modal"
        style={{ width: 880, maxWidth: "calc(100vw - 32px)" }}
      >
        {selected && (
          <article>
            <MarkdownRenderer
              content={selected.content}
              appearance={selected.appearance}
            />
          </article>
        )}
      </Modal>
    </>
  );
}
