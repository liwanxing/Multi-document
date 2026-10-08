"use client";
import { useState, useRef, useMemo, type ReactNode } from "react";
import {
  Button,
  Modal,
  Input,
  Select,
  Tooltip,
  Message,
  Form,
  Grid,
} from "@arco-design/web-react";
import { uploadMedia } from "@/lib/uploadMedia";
import {
  Video,
  Minus,
  Superscript,
  Subscript,
  FileUp,
  Table2,
  ScanLine,
  Braces,
} from "lucide-react";
const escape = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export function EditorIconTooltip({ label, hint, children }: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <Tooltip mini className="editor-icon-tooltip" content={hint || label}>
      <span className="editor-tool-tip-target">{children}</span>
    </Tooltip>
  );
}

function IconTool({ label, hint, icon, onClick, disabled, loading }: {
  label: string;
  hint?: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <EditorIconTooltip label={label} hint={hint}>
        <Button
          type="text"
          className="icon-button"
          aria-label={label}
          disabled={disabled}
          loading={loading}
          onClick={onClick}
        >
          {icon}
        </Button>
    </EditorIconTooltip>
  );
}
export default function EditorExtras({
  content,
  insert,
  onChange,
  onBusyChange,
}: {
  content: string;
  insert: (text: string, suffix?: string) => void;
  onChange: (content: string) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [mode, setMode] = useState("");
  const [url, setUrl] = useState("");
  const [width, setWidth] = useState("100%");
  const [height, setHeight] = useState("auto");
  const [index, setIndex] = useState(0);
  const [rows, setRows] = useState("3");
  const [cols, setCols] = useState("3");
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const media = useMemo(
    () =>
      Array.from(
        content.matchAll(
          /!\[([^\]]*)\]\(([^\s)]+)(?:\s+"[^"]*")?\)|<(img|video)\b[^>]*>(?:<\/video>)?/gi,
        ),
      ).map((m) => ({
        raw: m[0],
        start: m.index!,
        src: m[2] || /src=["']([^"']*)/.exec(m[0])?.[1] || "",
        type: m[3]?.toLowerCase() === "video" ? "video" : "img",
        alt: m[1] || "",
      })),
    [content],
  );
  function save() {
    if (mode === "table") {
      const r = Math.min(30, Math.max(1, Number(rows) || 3)),
        c = Math.min(12, Math.max(1, Number(cols) || 3));
      insert(
        [
          `| ${Array.from({ length: c }, (_, i) => `列 ${i + 1}`).join(" | ")} |`,
          `| ${Array(c).fill("---").join(" | ")} |`,
          ...Array(r).fill(`| ${Array(c).fill("内容").join(" | ")} |`),
        ].join("\n"),
      );
    } else {
      if (
        !/^(auto|\d+(?:\.\d+)?(?:px|%)?)$/.test(width) ||
        !/^(auto|\d+(?:\.\d+)?(?:px|%)?)$/.test(height)
      ) {
        Message.error("尺寸请填写 50%、640px 或 auto");
        return;
      }
      const item = mode === "resize" ? media[index] : undefined;
      const src = item?.src || url;
      if (
        !/^(https?:\/\/|\/(?!\/)|data:image\/(?:png|jpeg|gif|webp);base64,)/i.test(
          src,
        )
      ) {
        Message.error("请输入 http/https 视频地址");
        return;
      }
      const type = item?.type || "video";
      const dimension = (v: string) => (/^\d+$/.test(v) ? `${v}px` : v);
      const tag = `<${type} src="${escape(src)}" ${type === "video" ? 'controls preload="metadata"' : `alt="${escape(item?.alt || "图片")}"`} style="width:${dimension(width)};height:${dimension(height)};max-width:100%"${type === "video" ? "></video>" : ">"}`;
      if (item)
        onChange(
          content.slice(0, item.start) +
            tag +
            content.slice(item.start + item.raw.length),
        );
      else insert(tag);
    }
    setMode("");
  }
  return (
    <>
      <IconTool
        label="插入视频链接"
        icon={<Video size={18} aria-hidden="true" />}
        onClick={() => {
          setMode("video");
          setUrl("");
        }}
      />
      <IconTool label="插入分割线" icon={<Minus size={18} aria-hidden="true" />} onClick={() => insert("---")} />
      <IconTool label="上标" icon={<Superscript size={18} aria-hidden="true" />} onClick={() => insert("<sup>", "</sup>")} />
      <IconTool label="下标" icon={<Subscript size={18} aria-hidden="true" />} onClick={() => insert("<sub>", "</sub>")} />
      <IconTool label="上传文件" icon={<FileUp size={18} aria-hidden="true" />} loading={busy} onClick={() => file.current?.click()} />
      <IconTool label="插入表格" icon={<Table2 size={18} aria-hidden="true" />} onClick={() => setMode("table")} />
      <IconTool
        label="调整媒体尺寸"
        icon={<ScanLine size={18} aria-hidden="true" />}
        disabled={!media.length}
        onClick={() => {
          setIndex(0);
          setMode("resize");
        }}
      />
      <IconTool
        label="插入变量"
        hint="插入变量：{{brand_name}} 品牌名；{{company_name}} 公司名。可写默认值：{{custom_name|默认文字}}。"
        icon={<Braces size={18} aria-hidden="true" />}
        onClick={() => insert("{{brand_name}}")}
      />
      <input
        hidden
        type="file"
        ref={file}
        accept=".pdf,.txt,.md,.zip,.docx,.xlsx,.pptx,.mp4,.webm"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true);
          onBusyChange(true);
          try {
            const uploaded = await uploadMedia(f);
            insert(
              uploaded.type === "video"
                ? `<video src="${uploaded.url}" controls style="width:100%;height:auto"></video>`
                : `[${f.name.replace(/[\[\]]/g, "")}](${uploaded.url})`,
            );
          } catch (e) {
            Message.error((e as Error).message);
          } finally {
            setBusy(false);
            onBusyChange(false);
          }
        }}
      />
      <Modal
        title={
          mode === "table"
            ? "插入表格"
            : mode === "resize"
              ? "调整媒体尺寸"
              : "插入视频链接"
        }
        visible={!!mode}
        onCancel={() => setMode("")}
        onOk={save}
        okText={mode === "resize" ? "保存尺寸" : "确认插入"}
        cancelText="取消"
        unmountOnExit
        className="workspace-arco-modal"
        style={{ width: 480, maxWidth: "calc(100vw - 32px)" }}
      >
        <Form layout="vertical" className="mt-2">
          {mode === "table" ? (
            <Grid.Row gutter={16}>
              <Grid.Col span={12}>
                <Form.Item label="表格行数" extra="正文数据行数（不含表头）">
                  <Input
                    type="number"
                    value={rows}
                    onChange={setRows}
                    placeholder="3"
                  />
                </Form.Item>
              </Grid.Col>
              <Grid.Col span={12}>
                <Form.Item label="表格列数" extra="每一行包含的单元格数量">
                  <Input
                    type="number"
                    value={cols}
                    onChange={setCols}
                    placeholder="3"
                  />
                </Form.Item>
              </Grid.Col>
            </Grid.Row>
          ) : (
            <>
              {mode === "resize" ? (
                <Form.Item label="选择媒体" required>
                  <Select
                    aria-label="选择媒体"
                    value={index}
                    getPopupContainer={() => document.body}
                    triggerProps={{ autoAlignPopupWidth: true }}
                    options={media.map((m, i) => ({
                      value: i,
                      label: `${i + 1}. ${m.type === "video" ? "视频" : "图片"} ${m.alt || m.src}`,
                    }))}
                    onChange={setIndex}
                  />
                </Form.Item>
              ) : (
                <Form.Item
                  label="视频播放地址"
                  required
                  extra="支持可直接播放的 MP4 / WebM 直链地址"
                >
                  <Input
                    aria-label="视频地址"
                    value={url}
                    onChange={setUrl}
                    placeholder="https://example.com/video.mp4"
                  />
                </Form.Item>
              )}
              <Grid.Row gutter={16}>
                <Grid.Col span={12}>
                  <Form.Item label="宽度" extra="支持 100%、640px 或 auto">
                    <Input
                      aria-label="媒体宽度"
                      value={width}
                      onChange={setWidth}
                      placeholder="100% / 640px"
                    />
                  </Form.Item>
                </Grid.Col>
                <Grid.Col span={12}>
                  <Form.Item label="高度" extra="通常设为 auto 或 360px">
                    <Input
                      aria-label="媒体高度"
                      value={height}
                      onChange={setHeight}
                      placeholder="auto / 360px"
                    />
                  </Form.Item>
                </Grid.Col>
              </Grid.Row>
            </>
          )}
        </Form>
      </Modal>
    </>
  );
}
