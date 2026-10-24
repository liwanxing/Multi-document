"use client";
import { renderVariables } from "@/lib/variables";
import EditorExtras, { EditorIconTooltip } from "./EditorExtras";
import { Button, Modal, Alert, Input, InputNumber, Form, Radio, Select, Tabs, Tag, Message, Dropdown } from "@arco-design/web-react";
import { confirmAction } from "./DesignProvider";
import { uploadMedia } from "@/lib/uploadMedia";
import Link from "next/link";
import React, {
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  Save,
  Send,
  Highlighter,
  CornerDownLeft,
  ExternalLink,
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link2,
  ImagePlus,
  Undo2,
  Redo2,
  Upload,
  Download,
  Maximize2,
  Minimize2,
  Blocks,
  Palette,
  Check,
  Code2,
  PanelRightClose,
  PanelRightOpen,
  Info,
  CheckCircle2,
  AlertTriangle,
  Table2,
  GitBranch,
  Sigma,
  ChevronDown,
  Columns2,
  LayoutGrid,
  Sparkles,
  SplitSquareVertical,
  Film,
  Layers,
  Clapperboard,
  Images,
  FileDown,
  Presentation,
  Grid2X2,
  TableProperties,
  SatelliteDish,
  ListTree,
  Plus,
  Trash2,
  Edit3,
  Baseline,
} from "lucide-react";
import type { DocDetail, DocPlacement, Project } from "@/lib/dataStore";
import { components, defaultAppearance, stylePresets } from "@/lib/editor";
import PlacementPicker from "./PlacementPicker";
import { publishedHref } from "@/lib/projectModel";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import EditorIconPicker from "./EditorIconPicker";
import CustomIconSelector from "./CustomIconSelector";
import { getIconItem } from "@/lib/iconRegistry";
import { safeComponentStyle } from "@/lib/componentStyle";

export interface CustomComponentItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  group: string;
  className?: string;
  style?: string;
  snippet: string;
  createdAt?: number;
}

const DEFAULT_CUSTOM_COMPONENTS: CustomComponentItem[] = [
  {
    id: "custom-highlight-box",
    name: "高亮提示块",
    description: "浅蓝背景与边框的强调内容容器",
    icon: "sparkles",
    group: "自定义组件",
    className: "my-highlight-note",
    style: "padding: 16px; background-color: #f0f7ff; border: 1px solid #bae0ff; border-radius: 8px;",
    snippet: `:::styled {"className":"my-highlight-note","style":"padding: 16px; background-color: #f0f7ff; border: 1px solid #bae0ff; border-radius: 8px;"}\n> 💡 **重要说明**：在这里补充你的自定义组件说明内容，支持所有 Markdown 语法。\n:::`,
  },
];

const icons: Record<string, React.ElementType> = {
  info: Info,
  check: CheckCircle2,
  warning: AlertTriangle,
  code: Code2,
  tabs: Blocks,
  table: Table2,
  flow: GitBranch,
  math: Sigma,
  details: ChevronDown,
  columns: Columns2,
  list: List,
  cards: LayoutGrid,
  sparkles: Sparkles,
  split: SplitSquareVertical,
  video: Film,
  layers: Layers,
  storyboard: Clapperboard,
  keyframes: Images,
  file: FileDown,
  presentation: Presentation,
  grid: Grid2X2,
  "table-pro": TableProperties,
  "api-explorer": SatelliteDish,
  "api-params": ListTree,
};

export default function DocumentEditor({
  initial,
  projects,
  onBack,
  onSaved,
  previewProjectId: previewProjectIdProp,
}: {
  initial: DocDetail;
  projects: Project[];
  onBack: () => void;
  onSaved: (doc: DocDetail) => void;
  /** 预览变量渲染所用的项目（文档绑定多个项目时，决定 brand_name 等变量取谁的值） */
  previewProjectId?: string;
}) {
  const [doc, setDoc] = useState(initial);
  const [baseline, setBaseline] = useState(JSON.stringify(initial));
  const [busy, setBusy] = useState(false);
  const [savingAction, setSavingAction] = useState<"save" | "publish" | null>(null);
  const [uploading, setUploading] = useState(false);
  const pendingSelection = useRef<{
    start: number;
    end: number;
    scrollTop: number;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [view, setView] = useState<"edit" | "split" | "preview">("split");
  const [panel, setPanel] = useState<"components" | "styles">("components");
  const [panelOpen, setPanelOpen] = useState(true);
  const [full, setFull] = useState(false);
  const [bindingsDraft, setBindingsDraft] = useState<DocPlacement[] | null>(null);
  // 预览按哪个项目渲染变量：优先取打开编辑器时传入的项目上下文，
  // 否则取第一个绑定项目（文档可能同时绑定多个项目）
  const [previewProjectId, setPreviewProjectId] = useState(
    () =>
      previewProjectIdProp ||
      initial.placements?.[0]?.projectId ||
      projects[0]?.id ||
      "",
  );
  const [styleDraft, setStyleDraft] = useState<{ className: string; style: string } | null>(null);
  const [customComponents, setCustomComponents] = useState<CustomComponentItem[]>([]);
  const [customDraft, setCustomDraft] = useState<CustomComponentItem | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("volc_custom_components");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCustomComponents(parsed);
          return;
        }
      }
      setCustomComponents(DEFAULT_CUSTOM_COMPONENTS);
    } catch {
      setCustomComponents(DEFAULT_CUSTOM_COMPONENTS);
    }
  }, []);

  const inspectorBeforeFull = useRef(true);
  const nativeFullscreen = useRef(false);
  const previewArticleRef = useRef<HTMLElement>(null);
  const syncingPreviewScroll = useRef(false);
  function leaveFullscreen() {
    setFull(false);
    setMessage(current => current.startsWith("已展开编辑区") ? "" : current);
    setPanelOpen(inspectorBeforeFull.current);
  }
  useEffect(() => {
    const sync = () => {
      if (document.fullscreenElement) nativeFullscreen.current = true;
      else if (nativeFullscreen.current) {
        nativeFullscreen.current = false;
        leaveFullscreen();
      }
    };
    document.addEventListener("fullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    };
  }, []);
  async function toggleFullscreen() {
    if (full) {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
      leaveFullscreen();
      return;
    }
    inspectorBeforeFull.current = panelOpen;
    setPanelOpen(false);
    setFull(true);
    setError("");
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Embedded and background browsers can deny native fullscreen. Keep the
      // expanded writing workspace usable, with the same exit button and Esc.
      setMessage("已展开编辑区；浏览器未允许系统全屏，可按 Esc 退出专注编辑。");
    }
  }
  const [leavePrompt, setLeavePrompt] = useState(false);
  const [componentClass, setComponentClass] = useState("");
  const [componentStyle, setComponentStyle] = useState("");
  const [search, setSearch] = useState("");
  const [history, setHistory] = useState([initial.content]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const selection = useRef({ start: 0, end: 0 });
  const importInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const dirty = !doc.updatedAt || JSON.stringify(doc) !== baseline;
  const preview = useDeferredValue(doc.content);
  const appearance = doc.appearance || defaultAppearance;

  useLayoutEffect(() => {
    const pending = pendingSelection.current;
    const input = textarea.current;
    if (!pending || !input) return;
    input.focus({ preventScroll: true });
    input.setSelectionRange(pending.start, pending.end);
    input.scrollTop = pending.scrollTop;
    selection.current = { start: pending.start, end: pending.end };
    pendingSelection.current = null;
  }, [doc.content, view]);
  function changeContent(content: string) {
    setDoc((current) => ({ ...current, content }));
    setMessage("");
    setHistory((current) =>
      [...current.slice(0, historyIndex + 1), content].slice(-150),
    );
    setHistoryIndex(Math.min(historyIndex + 1, 149));
  }
  function undo(offset: number) {
    const index = historyIndex + offset;
    if (index < 0 || index >= history.length) return;
    setHistoryIndex(index);
    setDoc((current) => ({ ...current, content: history[index] }));
  }
  function insert(text: string, suffix?: string, defaultContent?: string) {
    const { start, end } = selection.current;
    const hasSelection = start !== end;
    const selected = hasSelection
      ? doc.content.slice(start, end)
      : (defaultContent ?? "文本");

    let lead = text;
    let trail = suffix !== undefined ? suffix : "\n\n";

    if (text.startsWith("```") || text.includes("\n```")) {
      const charBefore = start > 0 ? doc.content[start - 1] : "\n";
      if (charBefore !== "\n") lead = "\n\n" + lead;
      const charAfter = end < doc.content.length ? doc.content[end] : "\n";
      if (charAfter !== "\n") trail = trail + "\n\n";
    }

    const insertion =
      suffix !== undefined ? lead + selected + trail : "\n\n" + text + "\n\n";
    const from = suffix !== undefined ? start + lead.length : start + 2;
    pendingSelection.current = {
      start: from,
      end: suffix !== undefined ? from + selected.length : from,
      scrollTop: textarea.current?.scrollTop || 0,
    };
    changeContent(
      doc.content.slice(0, start) + insertion + doc.content.slice(end),
    );
    if (view === "preview") setView("split");
  }
  function insertInline(text: string) {
    const input = textarea.current;
    let start = selection.current.start;
    let end = selection.current.end;

    if (input && typeof input.selectionStart === "number") {
      start = input.selectionStart;
      end = input.selectionEnd;
    }

    const nextCursor = start + text.length;
    selection.current = { start: nextCursor, end: nextCursor };
    pendingSelection.current = {
      start: nextCursor,
      end: nextCursor,
      scrollTop: input?.scrollTop || 0,
    };
    changeContent(
      doc.content.slice(0, start) + text + doc.content.slice(end),
    );
    if (view === "preview") setView("split");
  }
  function insertBlock(prefix: string) {
    const start =
      doc.content.lastIndexOf("\n", Math.max(0, selection.current.start - 1)) +
      1;
    const endOfLine = doc.content.indexOf("\n", selection.current.end);
    const end = endOfLine < 0 ? doc.content.length : endOfLine;
    const lines = (doc.content.slice(start, end) || "文本").split("\n");
    const block = lines
      .map(
        (line, index) => (prefix === "1. " ? `${index + 1}. ` : prefix) + line,
      )
      .join("\n");
    pendingSelection.current = {
      start,
      end: start + block.length,
      scrollTop: textarea.current?.scrollTop || 0,
    };
    changeContent(doc.content.slice(0, start) + block + doc.content.slice(end));
  }

  // 分屏模式：左侧编辑区滚动时，右侧预览按滚动比例联动
  function handleSourceScroll() {
    if (view !== "split" || syncingPreviewScroll.current) return;
    const source = textarea.current;
    const preview = previewArticleRef.current;
    if (!source || !preview) return;
    const sourceMax = source.scrollHeight - source.clientHeight;
    if (sourceMax <= 0) return;
    syncingPreviewScroll.current = true;
    const ratio = source.scrollTop / sourceMax;
    preview.scrollTop = ratio * (preview.scrollHeight - preview.clientHeight);
    requestAnimationFrame(() => {
      syncingPreviewScroll.current = false;
    });
  }

  // 文本颜色：写入 <span style="color: ...">，渲染层安全白名单已允许
  const TEXT_COLORS: Array<{ name: string; value: string }> = [
    { name: "深黑", value: "#1d2129" },
    { name: "灰色", value: "#4e5969" },
    { name: "浅灰", value: "#86909c" },
    { name: "红色", value: "#f53f3f" },
    { name: "橙色", value: "#ff7d00" },
    { name: "金色", value: "#ffb400" },
    { name: "绿色", value: "#00b42a" },
    { name: "青色", value: "#14c9c9" },
    { name: "蓝色", value: "#3491fa" },
    { name: "品牌蓝", value: "#165dff" },
    { name: "紫色", value: "#722ed1" },
    { name: "品红", value: "#f5319d" },
  ];

  function currentSelection() {
    const input = textarea.current;
    let start = selection.current.start;
    let end = selection.current.end;
    if (input && typeof input.selectionStart === "number") {
      start = input.selectionStart;
      end = input.selectionEnd;
    }
    return { start, end };
  }

  function applyTextColor(color: string) {
    const { start, end } = currentSelection();
    const input = textarea.current;
    const selected = doc.content.slice(start, end) || "彩色文本";
    const body = `<span style="color: ${color}">${selected}</span>`;
    pendingSelection.current = {
      start: start + body.indexOf(">") + 1,
      end: start + body.length - "</span>".length,
      scrollTop: input?.scrollTop || 0,
    };
    changeContent(doc.content.slice(0, start) + body + doc.content.slice(end));
    if (view === "preview") setView("split");
  }

  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  function clearTextColor() {
    const { start, end } = currentSelection();
    const input = textarea.current;
    const segment = doc.content.slice(start, end);
    if (!segment) return;
    const cleaned = segment.replace(
      /<span style="color:\s*[^"]*">([\s\S]*?)<\/span>/g,
      "$1",
    );
    if (cleaned === segment) return;
    pendingSelection.current = {
      start,
      end: start + cleaned.length,
      scrollTop: input?.scrollTop || 0,
    };
    changeContent(doc.content.slice(0, start) + cleaned + doc.content.slice(end));
  }

  const saveCustomComponents = (items: CustomComponentItem[]) => {
    setCustomComponents(items);
    try {
      localStorage.setItem("volc_custom_components", JSON.stringify(items));
    } catch (e) {
      console.error("Failed to save custom components to localStorage", e);
    }
  };

  const handleSaveCustomComponent = (draft: CustomComponentItem, shouldInsert: boolean) => {
    if (!draft.name.trim()) {
      Message.warning("请填写组件名称");
      return;
    }
    const finalSnippet =
      draft.snippet.trim() ||
      (draft.className?.trim() || draft.style?.trim()
        ? `:::styled ${JSON.stringify({
            className: draft.className?.trim() || "",
            style: draft.style?.trim() || "",
          })}\n> 在这里填写【${draft.name.trim()}】的内容，支持 Markdown 语法与组件嵌套。\n:::`
        : `> 在这里填写【${draft.name.trim()}】的内容，支持 Markdown 语法与组件嵌套。`);

    const itemToSave: CustomComponentItem = {
      ...draft,
      id: draft.id || `custom-${Date.now()}`,
      name: draft.name.trim(),
      description: draft.description.trim() || "自定义内容块",
      icon: draft.icon || "sparkles",
      group: "自定义组件",
      className: draft.className?.trim() || "",
      style: draft.style?.trim() || "",
      snippet: finalSnippet,
      createdAt: draft.createdAt || Date.now(),
    };

    const exists = customComponents.some((c) => c.id === itemToSave.id);
    const updated = exists
      ? customComponents.map((c) => (c.id === itemToSave.id ? itemToSave : c))
      : [itemToSave, ...customComponents];

    saveCustomComponents(updated);
    setCustomDraft(null);

    if (shouldInsert) {
      insert(itemToSave.snippet);
      Message.success(`已保存并插入组件「${itemToSave.name}」`);
    } else {
      Message.success(`已保存组件「${itemToSave.name}」到自定义组件列表`);
    }
  };

  const handleDeleteCustomComponent = async (id: string) => {
    const ok = await confirmAction(
      "确定要从列表中移除此自定义组件吗？已插入到正文的内容不受影响。",
      true,
    );
    if (!ok) return;
    const updated = customComponents.filter((c) => c.id !== id);
    saveCustomComponents(updated);
    Message.success("已移除自定义组件");
  };

  // 供非技术用户复制给 AI 助手、由 AI 生成组件样式的提示词
  // （属性白名单与 componentStyle.ts 的 safeComponentStyle 保持一致）
  const aiStylePrompt = customDraft
    ? [
        "请为技术文档编辑器的自定义组件生成一段内联 CSS 样式（style 属性字符串）。",
        "该组件是一个 Markdown 内容容器，自带默认外观：内边距 16px、圆角 8px、浅灰背景 #f8f9fc、1px 浅灰边框；你写的样式会逐条覆盖这些默认值。",
        `组件名称：${customDraft.name || "（未填写）"}`,
        `组件用途：${customDraft.description || "（未填写）"}`,
        "要求：",
        "1. 只输出一行 style 样式字符串，不要解释，不要 Markdown 代码块标记，不要换行；",
        "2. 只能使用以下 CSS 属性：",
        "- 颜色与背景：color、background、background-color（值支持 #hex、rgba()、linear-gradient() 渐变）",
        "- 边框与阴影：border、border-color、border-width、border-style、border-radius、border-top、border-bottom、border-left、border-right、box-shadow",
        "- 间距：padding、padding-top、padding-bottom、padding-left、padding-right、margin、margin-top、margin-bottom、margin-left、margin-right、gap、row-gap、column-gap",
        "- 文字：font-size、font-weight、font-family、font-style、line-height、letter-spacing、text-align、text-decoration",
        "- 尺寸：width、min-width、max-width、height、min-height、max-height",
        "- 布局：display、flex、flex-direction、align-items、justify-content、flex-wrap、opacity、overflow、overflow-x、overflow-y",
        "3. 禁止使用：url() 背景图、position、z-index、transform、transition、animation、var()；字体名称含空格时用单引号（双引号会被系统过滤）；",
        "4. 风格简洁现代，适合技术文档阅读，与浅色页面协调。",
        "返回格式示例：padding: 16px; background: linear-gradient(135deg, #f0f7ff, #e8f1ff); border: 1px solid #bae0ff; border-radius: 8px; box-shadow: 0 2px 8px rgba(22, 93, 255, 0.08);",
      ].join("\n")
    : "";

  const copyAiStylePrompt = async () => {
    try {
      await navigator.clipboard.writeText(aiStylePrompt);
      Message.success("AI 提示词已复制，发送给 AI 后把返回的样式粘贴到「组件样式」");
    } catch {
      Message.error("复制失败，请手动选择提示词文本复制");
    }
  };

  async function save(publish: boolean) {
    if (busy || uploading) return;
    if (!doc.title.trim()) {
      setError("请填写文档标题");
      return;
    }
    if (!doc.placements?.length) {
      setError("请至少绑定到一个项目的产品目录");
      return;
    }
    setBusy(true);
    setSavingAction(publish ? "publish" : "save");
    setError("");
    setMessage("");
    try {
      const response = await fetch(
        `/api/admin/docs/${publish ? "publish" : "save"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(doc),
        },
      );
      const result = await response.json();
      if (!response.ok || result.code !== 0)
        throw new Error(result.message || "保存失败");
      setDoc(result.data);
      setBaseline(JSON.stringify(result.data));
      onSaved(result.data);
      setMessage(
        publish
          ? result.unchanged
            ? "内容与已发布版本一致，未产生新版本"
            : `已发布 v${result.data.version}，绑定项目的文档中心已更新`
          : "草稿已保存，前台已发布内容保持不变",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "网络异常，请重试");
    } finally {
      setBusy(false);
      setSavingAction(null);
    }
  }
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && full && !document.fullscreenElement && !document.querySelector('[role="dialog"]')) {
        leaveFullscreen();
      }
      // Dialog input must not trigger a document save before its changes are applied.
      if (bindingsDraft !== null || styleDraft !== null || customDraft !== null || leavePrompt || document.querySelector('[role="dialog"]')) return;
      if (!(event.metaKey || event.ctrlKey)) {
        if (event.key === "Enter" && event.shiftKey && document.activeElement === textarea.current && !busy) {
          event.preventDefault();
          insertInline("<br />\n");
        }
        return;
      }
      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save(false);
      }
      if (document.activeElement !== textarea.current || busy) return;
      if (event.key.toLowerCase() === "b") {
        event.preventDefault();
        insert("**", "**");
      }
      if (event.key.toLowerCase() === "i") {
        event.preventDefault();
        insert("*", "*");
      }
      if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo(event.shiftKey ? 1 : -1);
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("keydown", keydown);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("keydown", keydown);
    };
  });
  async function readImage(file?: File) {
    if (!file || uploading) return;
    if (
      !/^image\/(png|jpeg|gif|webp)$/.test(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      setError("请选择 10MB 内 PNG、JPG、GIF 或 WebP 图片");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const uploaded = await uploadMedia(file);
      insert(`![${file.name.replace(/[\[\]\r\n]/g, "")}](${uploaded.url})`);
      setMessage("图片已上传，可在预览中点击放大");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setUploading(false);
    }
  }
  async function importMarkdown(file?: File) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("文件不能超过 5MB");
      return;
    }
    if (
      doc.content &&
      !(await confirmAction("导入将替换当前正文，可以通过撤销恢复。继续导入？"))
    )
      return;
    try {
      changeContent(await file.text());
      setMessage("正文已导入，请检查后保存");
    } catch {
      setError("文件读取失败");
    }
  }
  function exportMarkdown() {
    const url = URL.createObjectURL(
      new Blob([doc.content], { type: "text/markdown;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${doc.title.replace(/[\\/:*?"<>|]/g, "-")}.md`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const toolbar: Array<{
    name: string;
    icon: React.ElementType;
    prefix?: string;
    suffix?: string;
    placeholder?: string;
    action?: () => void;
  }> = [
    { name: "二级标题", icon: Heading2, prefix: "## ", suffix: "" },
    { name: "三级标题", icon: Heading3, prefix: "### ", suffix: "" },
    { name: "加粗", icon: Bold, prefix: "**", suffix: "**" },
    { name: "斜体", icon: Italic, prefix: "*", suffix: "*" },
    { name: "删除线", icon: Strikethrough, prefix: "~~", suffix: "~~" },
    { name: "高亮", icon: Highlighter, prefix: "==", suffix: "==" },
    {
      name: "换行",
      icon: CornerDownLeft,
      action: () => insertInline("<br />\n"),
    },
    { name: "无序列表", icon: List, prefix: "- ", suffix: "" },
    { name: "有序列表", icon: ListOrdered, prefix: "1. ", suffix: "" },
    {
      name: "链接",
      icon: Link2,
      prefix: "[",
      suffix: "](https://example.com/请替换为目标链接)",
    },
    {
      name: "代码块",
      icon: Code2,
      prefix: "```\n",
      suffix: "\n```",
      placeholder: "// 在此输入代码",
    },
  ];
  return (
    <section className={`document-editor ${full ? "editor-fullscreen" : ""}`}>
      <header className="editor-header">
        <Button
          type="text"
          className="icon-button"
          aria-label="返回文档中心"
          onClick={() => {
            if (dirty) setLeavePrompt(true);
            else onBack();
          }}
          disabled={busy || uploading}
        >
          <ArrowLeft size={19} />
        </Button>
        <div className="editor-heading">
          <span className="eyebrow">文档中心 / 编辑文档</span>
          <strong>{doc.title || "未命名文档"}</strong>
        </div>
        <span className={`status-pill ${dirty ? "amber" : ""}`}>
          {dirty
            ? "未保存"
            : doc.status === "published"
              ? `已发布 v${doc.version}`
              : "草稿"}
        </span>
        <div className="editor-header-actions">
          {doc.status === "published" &&
            !dirty &&
            publishedHref(projects, doc) && (
              <Link
                className="button"
                target="_blank"
                href={publishedHref(projects, doc)}
              >
                <ExternalLink size={14} />
                查看发布
              </Link>
            )}
          <Button
            type="secondary"
            className=""
            disabled={busy || uploading}
            loading={savingAction === "save"}
            onClick={() => save(false)}
          >
            <Save size={15} />
            保存草稿
          </Button>
          <Button
            type="primary"
            className=""
            disabled={busy || uploading}
            loading={savingAction === "publish"}
            onClick={() => save(true)}
          >
            <Send size={15} />
            发布文档
          </Button>
        </div>
      </header>
      {uploading && <Alert type="info" content="文件上传中，请稍候…" />}
      {(error || message) && <Alert type={error ? "error" : "success"} content={error || message}
        closable onClose={() => { setError(""); setMessage(""); }} />}
      <div className="editor-body">
        <div className="editor-main">
          <div className="editor-controls">
            <Radio.Group type="button" size="small" name="编辑模式" value={view} onChange={setView}
              options={[{ label: "编辑", value: "edit" }, { label: "分屏", value: "split" }, { label: "预览", value: "preview" }]} />
          {view !== "preview" && (
            <div className="format-toolbar" role="toolbar" aria-label="格式工具栏">
              <EditorIconTooltip label="撤销">
              <Button
                type="text"
                className="icon-button"
                aria-label="撤销"
                onClick={() => undo(-1)}
                disabled={busy || uploading || historyIndex === 0}
              >
                <Undo2 size={16} />
              </Button>
              </EditorIconTooltip>
              <EditorIconTooltip label="重做">
              <Button
                type="text"
                className="icon-button"
                aria-label="重做"
                onClick={() => undo(1)}
                disabled={busy || uploading || historyIndex === history.length - 1}
              >
                <Redo2 size={16} />
              </Button>
              </EditorIconTooltip>
              <span className="toolbar-divider" />
              <Select
                aria-label="标题层级"
                className="heading-select"
                size="small"
                value=""
                disabled={busy || uploading}
                options={[{label: "正文", value: ""}, ...[1,2,3,4,5,6].map(n => ({label: `H${n}`, value: "#".repeat(n) + " "}))]}
                onChange={(value) => {
                  const start =
                    doc.content.lastIndexOf(
                      "\n",
                      Math.max(0, selection.current.start - 1),
                    ) + 1;
                  const end = doc.content.indexOf("\n", selection.current.end);
                  const stop = end < 0 ? doc.content.length : end;
                  changeContent(
                    doc.content.slice(0, start) +
                      doc.content
                        .slice(start, stop)
                        .split("\n")
                        .map(
                          (line) =>
                            value + line.replace(/^#{1,6}\s+/, ""),
                        )
                        .join("\n") +
                      doc.content.slice(stop),
                  );
                }}
              />
              {toolbar
                .filter(
                  (item) =>
                    ![Heading2, Heading3].includes(
                      item.icon as typeof Heading2,
                    ),
                )
                .map((item) => (
                  <EditorIconTooltip key={item.name} label={item.name}>
                  <Button
                    type="text"
                    className="icon-button"
                    aria-label={item.name}
                    disabled={busy || uploading}
                    onClick={() =>
                      item.action
                        ? item.action()
                        : item.suffix === ""
                          ? insertBlock(item.prefix || "")
                          : insert(
                              item.prefix || "",
                              item.suffix || "",
                              (item as { placeholder?: string }).placeholder,
                            )
                    }
                  >
                    <item.icon size={16} />
                  </Button>
                  </EditorIconTooltip>
                ))}
              {/* 文本颜色 */}
              <Dropdown
                trigger="click"
                popupVisible={colorPickerOpen}
                onVisibleChange={setColorPickerOpen}
                disabled={busy || uploading}
                droplist={
                  <div className="editor-color-palette" role="menu" aria-label="文本颜色">
                    {TEXT_COLORS.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        title={color.name}
                        aria-label={`文本颜色 ${color.name}`}
                        className="editor-color-swatch"
                        style={{ backgroundColor: color.value }}
                        onClick={() => {
                          applyTextColor(color.value);
                          setColorPickerOpen(false);
                        }}
                      />
                    ))}
                    <button
                      type="button"
                      className="editor-color-clear"
                      onClick={() => {
                        clearTextColor();
                        setColorPickerOpen(false);
                      }}
                    >
                      清除颜色
                    </button>
                  </div>
                }
              >
                <Button
                  type="text"
                  className="icon-button"
                  aria-label="文本颜色"
                  disabled={busy || uploading}
                >
                  <Baseline size={16} />
                </Button>
              </Dropdown>
              <EditorIconTooltip label="插入本地图片">
              <Button
                type="text"
                className="icon-button"
                aria-label="插入本地图片"
                disabled={busy || uploading}
                onClick={() => imageInput.current?.click()}
              >
                <ImagePlus size={16} />
              </Button>
              </EditorIconTooltip>
              <EditorIconPicker onInsert={insertInline} disabled={busy || uploading} />
              <span className="toolbar-divider" />
              <fieldset
                disabled={busy || uploading}
                className="editor-extra-tools"
                aria-label="插入工具"
              >
                <EditorExtras
                  content={doc.content}
                  insert={insert}
                  onChange={changeContent}
                  onBusyChange={setUploading}
                />
              </fieldset>
            </div>
          )}
            <div className="flex gap-1">
              <EditorIconTooltip label="导入 Markdown">
              <Button
                type="text"
                className="icon-button"
                onClick={() => importInput.current?.click()}
                aria-label="导入 Markdown"
                disabled={busy || uploading}
              >
                <Upload size={16} />
              </Button>
              </EditorIconTooltip>
              <EditorIconTooltip label="导出 Markdown">
              <Button
                type="text"
                className="icon-button"
                onClick={exportMarkdown}
                aria-label="导出 Markdown"
              >
                <Download size={16} />
              </Button>
              </EditorIconTooltip>
              <EditorIconTooltip label={full ? "退出全屏" : "全屏编辑"}>
              <Button
                type="text"
                className="icon-button"
                onClick={() => void toggleFullscreen()}
                aria-label={full ? "退出全屏" : "全屏编辑"}
              >
                {full ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </Button>
              </EditorIconTooltip>
              <EditorIconTooltip label={panelOpen ? "收起文档设置" : "展开文档设置"}>
              <Button
                type="text"
                className="icon-button"
                aria-label={panelOpen ? "收起文档设置" : "展开文档设置"}
                aria-expanded={panelOpen}
                onClick={() => setPanelOpen(!panelOpen)}
              >
                {panelOpen ? (
                  <PanelRightClose size={16} />
                ) : (
                  <PanelRightOpen size={16} />
                )}
              </Button>
              </EditorIconTooltip>
            </div>
          </div>
          <div className={`writing-panes mode-${view}`}>
            {view !== "preview" && (
              <div className="source-pane">
                <div className="pane-label">
                  <span>MARKDOWN</span>
                  <span>⌘ / Ctrl + S 保存</span>
                </div>
                <textarea
                  ref={textarea}
                  aria-label="Markdown 正文"
                  spellCheck={false}
                  disabled={busy || uploading}
                  value={doc.content}
                  placeholder="从这里开始编写，或从右侧插入一个组件…"
                  onChange={(e) => {
                    selection.current = {
                      start: e.target.selectionStart,
                      end: e.target.selectionEnd,
                    };
                    changeContent(e.target.value);
                  }}
                  onSelect={(e) => {
                    selection.current = {
                      start: e.currentTarget.selectionStart,
                      end: e.currentTarget.selectionEnd,
                    };
                  }}
                  onClick={(e) => {
                    selection.current = {
                      start: e.currentTarget.selectionStart,
                      end: e.currentTarget.selectionEnd,
                    };
                  }}
                  onKeyUp={(e) => {
                    selection.current = {
                      start: e.currentTarget.selectionStart,
                      end: e.currentTarget.selectionEnd,
                    };
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Tab") {
                      e.preventDefault();
                      const start = e.currentTarget.selectionStart;
                      const end = e.currentTarget.selectionEnd;
                      changeContent(
                        doc.content.slice(0, start) +
                          "  " +
                          doc.content.slice(end),
                      );
                      requestAnimationFrame(() => {
                        textarea.current?.setSelectionRange(
                          start + 2,
                          start + 2,
                        );
                      });
                    }
                  }}
                  onScroll={handleSourceScroll}
                  onPaste={(e) => {
                    const file = Array.from(e.clipboardData.files).find(
                      (file) => file.type.startsWith("image/"),
                    );
                    if (file) {
                      e.preventDefault();
                      void readImage(file);
                    }
                  }}
                />
              </div>
            )}
            {view !== "edit" && (
              <div className="preview-pane">
                <div className="pane-label">
                  <span>实时预览</span>
                  <span className="live-dot">与发布样式一致</span>
                  {(doc.placements?.length ?? 0) > 1 && (
                    <Select
                      size="mini"
                      value={previewProjectId}
                      onChange={(v) => setPreviewProjectId(String(v))}
                      style={{ marginLeft: "auto", width: 150 }}
                      triggerProps={{ autoAlignPopupWidth: false }}
                    >
                      {doc.placements!.map((p) => {
                        const proj = projects.find((x) => x.id === p.projectId);
                        return (
                          <Select.Option key={p.projectId} value={p.projectId}>
                            {proj?.name || p.projectId}
                          </Select.Option>
                        );
                      })}
                    </Select>
                  )}
                </div>
                <article ref={previewArticleRef}>
                  <h1 className="preview-title">{doc.title || "文档标题"}</h1>
                  {preview ? (
                    <MarkdownRenderer
                      content={
                        projects.find((p) => p.id === previewProjectId)
                          ? renderVariables(
                              preview,
                              projects.find((p) => p.id === previewProjectId)!,
                            )
                          : preview
                      }
                      appearance={appearance}
                    />
                  ) : (
                    <div className="preview-empty">正文预览会显示在这里</div>
                  )}
                </article>
              </div>
            )}
          </div>
          <footer className="editor-footer">
            <span>
              {doc.content.length.toLocaleString()} 字符 ·{" "}
              {doc.content.split("\n").length} 行
            </span>
            <span>
              预计阅读 {Math.max(1, Math.ceil(doc.content.length / 400))} 分钟
            </span>
          </footer>
        </div>
        {panelOpen && (
          <aside className="editor-inspector">
            <div className="document-meta">
              <h3>文档信息</h3>
              <Form layout="vertical" disabled={busy || uploading} className="editor-meta-form">
                <Form.Item label="文档标题" required>
                  <Input aria-label="文档标题" value={doc.title} maxLength={160} placeholder="输入文档标题"
                    onChange={(title) => setDoc(current => ({ ...current, title }))} />
                </Form.Item>
                <Form.Item label="文档摘要">
                  <Input.TextArea aria-label="文档摘要" value={doc.description || ""} autoSize={{ minRows: 2, maxRows: 4 }}
                    placeholder="简要介绍文档内容（可选）" onChange={(description) => setDoc(current => ({ ...current, description }))} />
                </Form.Item>
                <Form.Item label="版本号" extra="由系统在发布时自动递增；保存草稿不改变版本号。">
                  <InputNumber aria-label="版本号" value={doc.version} min={0} max={Number.MAX_SAFE_INTEGER} precision={0}
                    disabled
                    onChange={(version) => setDoc(current => ({ ...current, version: version ?? current.version }))} />
                </Form.Item>
                <div className="editor-binding-summary">
                  <div><strong>项目绑定</strong><Tag size="small">{doc.placements?.length || 0} 个位置</Tag></div>
                  <Button long icon={<Link2 size={14} />} disabled={busy || uploading}
                    onClick={() => setBindingsDraft([...(doc.placements || [])])}>管理项目绑定</Button>
                  <p className="form-help">{(doc.placements?.length || 0) > 1 ? "发布后将同步更新所有绑定目录。" : "选择文档在项目中的展示位置。"}</p>
                </div>
                <Form.Item label="本次更新说明">
                  <Input.TextArea aria-label="本次更新说明" value={doc.changeNote || ""} maxLength={500}
                    autoSize={{ minRows: 2, maxRows: 4 }} placeholder="发布后展示在产品动态（可选）"
                    onChange={(changeNote) => setDoc(current => ({ ...current, changeNote }))} />
                </Form.Item>
              </Form>
            </div>
            <Tabs className="editor-inspector-tabs" activeTab={panel} onChange={key => setPanel(key as typeof panel)}>
              <Tabs.TabPane key="components" title={<span><Blocks size={15} />编辑器组件</span>} />
              <Tabs.TabPane key="styles" title={<span><Palette size={15} />预制样式</span>} />
            </Tabs>
            <div className="inspector-content">
              {panel === "components" ? (
                <>
                  <h3>用组件丰富你的文档</h3>
                  <p className="muted">点击插入到光标位置，内容可继续编辑。</p>
                  <div className="editor-style-action flex flex-col gap-2">
                    <Button
                      long
                      type="primary"
                      icon={<Plus size={14} />}
                      disabled={busy || uploading}
                      onClick={() =>
                        setCustomDraft({
                          id: "",
                          name: "",
                          description: "",
                          icon: "sparkles",
                          group: "自定义组件",
                          className: "",
                          style: "padding: 16px; background-color: #f5f7ff; border: 1px solid #d0e2ff; border-radius: 8px;",
                          snippet: `:::styled {"className":"custom-card","style":"padding: 16px; background-color: #f5f7ff; border: 1px solid #d0e2ff; border-radius: 8px;"}\n> 这里填写自定义内容，支持 **Markdown** 与组件嵌套。\n:::`,
                        })
                      }
                    >
                      添加自定义组件
                    </Button>
                    {(componentClass || componentStyle) && (
                      <div className="editor-style-summary">
                        <Tag size="small" color="arcoblue">已启用包裹样式</Tag>
                        <span>应用于接下来插入的组件</span>
                        <Button
                          type="text"
                          size="mini"
                          disabled={busy || uploading}
                          onClick={() => { setComponentClass(""); setComponentStyle(""); }}
                        >
                          清除
                        </Button>
                      </div>
                    )}
                  </div>
                  <Input.Search aria-label="搜索组件" placeholder="搜索组件…" value={search} allowClear onChange={setSearch} />

                  {/* 项目变量 section：展示当前预览项目的内置变量与自定义字段，点击插入 {{变量名}} */}
                  {(() => {
                    const previewProject = projects.find((p) => p.id === previewProjectId);
                    if (!previewProject) return null;
                    const vars: { key: string; label: string; hint: string; builtin?: boolean }[] = [
                      { key: "brand_name", label: "品牌名称", hint: previewProject.brandName || previewProject.name, builtin: true },
                      { key: "company_name", label: "公司名称", hint: previewProject.company || previewProject.brandName || previewProject.name, builtin: true },
                      ...(previewProject.customFields || [])
                        .filter((f) => f.key && f.key.trim())
                        .map((f) => ({ key: f.key.trim(), label: f.label || f.key, hint: f.value || "未设置值" })),
                    ];
                    const filtered = vars.filter((v) =>
                      (v.key + v.label + v.hint).toLowerCase().includes(search.toLowerCase()),
                    );
                    if (!filtered.length) return null;
                    return (
                      <section key="项目变量">
                        <div className="flex items-center justify-between mb-1.5">
                          <h4 className="component-group !mb-0 text-[#165dff] flex items-center gap-1.5 font-semibold">
                            <Baseline size={14} /> 项目变量
                          </h4>
                          <span className="text-[11px] font-normal text-gray-400">
                            {previewProject.name} · {filtered.length} 个
                          </span>
                        </div>
                        <div className="component-grid">
                          {filtered.map((v) => (
                            <button
                              key={v.key}
                              className="component-card w-full"
                              disabled={busy || uploading}
                              onClick={() => insert(`{{${v.key}}}`)}
                              title={`当前值：${v.hint}\n点击插入 {{${v.key}}}`}
                            >
                              <span className="component-icon icon-sparkles">
                                <Baseline size={19} />
                              </span>
                              <strong>
                                {`{{${v.key}}}`}
                                {v.builtin && <Tag size="small" color="gray" style={{ marginLeft: 4 }}>内置</Tag>}
                              </strong>
                              <small>
                                {v.label} · {v.hint}
                              </small>
                              <span className="insert-plus">+</span>
                            </button>
                          ))}
                        </div>
                      </section>
                    );
                  })()}
                  
                  {/* 自定义组件 section */}
                  {(() => {
                    const customItems = customComponents.filter(
                      (c) => (c.name + c.description).includes(search)
                    );
                    if (!customItems.length) return null;
                    return (
                      <section key="自定义组件">
                        <div className="flex items-center justify-between mb-1.5">
                          <h4 className="component-group !mb-0 text-[#165dff] flex items-center gap-1.5 font-semibold">
                            <Sparkles size={14} /> 自定义组件
                          </h4>
                          <span className="text-[11px] font-normal text-gray-400">{customItems.length} 个</span>
                        </div>
                        <div className="component-grid">
                          {customItems.map((item) => {
                            const Icon = getIconItem(item.icon)?.icon || icons[item.icon] || Sparkles;
                            return (
                              <div key={item.id} className="relative group/custom-card w-full">
                                <button
                                  className="component-card w-full"
                                  disabled={busy || uploading}
                                  onClick={() =>
                                    insert(
                                      componentClass || componentStyle
                                        ? `:::styled ${JSON.stringify({ className: componentClass, style: componentStyle })}\n${item.snippet}\n:::`
                                        : item.snippet
                                    )
                                  }
                                  title={item.description}
                                >
                                  <span className={`component-icon icon-${item.icon}`}>
                                    <Icon size={19} />
                                  </span>
                                  <strong>{item.name}</strong>
                                  <small>{item.description}</small>
                                  <span className="insert-plus">+</span>
                                </button>
                                <div className="absolute top-1.5 right-1.5 hidden group-hover/custom-card:flex items-center gap-0.5 z-10 bg-white/95 backdrop-blur-sm rounded p-0.5 shadow-sm border border-gray-200">
                                  <Button
                                    size="mini"
                                    type="text"
                                    icon={<Edit3 size={12} />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCustomDraft({ ...item });
                                    }}
                                    title="编辑组件"
                                  />
                                  <Button
                                    size="mini"
                                    type="text"
                                    status="danger"
                                    icon={<Trash2 size={12} />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteCustomComponent(item.id);
                                    }}
                                    title="删除组件"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })()}

                  {["卡片与导航", "AI与多模态", "页面结构", "内容强调", "技术内容"].map((group) => {
                    const items = components.filter(
                      (c) =>
                        c.group === group &&
                        (c.name + c.description).includes(search),
                    );
                    return items.length ? (
                      <section key={group}>
                        <h4 className="component-group">{group}</h4>
                        <div className="component-grid">
                          {items.map((item) => {
                            const Icon = icons[item.icon];
                            return (
                              <button
                                className="component-card"
                                key={item.id}
                                disabled={busy || uploading}
                                onClick={() =>
                                  insert(
                                    componentClass || componentStyle
                                      ? `:::styled ${JSON.stringify({ className: componentClass, style: componentStyle })}\n${item.snippet}\n:::`
                                      : item.snippet,
                                  )
                                }
                                title={item.description}
                              >
                                <span
                                  className={`component-icon icon-${item.icon}`}
                                >
                                  <Icon size={19} />
                                </span>
                                <strong>{item.name}</strong>
                                <small>{item.description}</small>
                                <span className="insert-plus">+</span>
                              </button>
                            );
                          })}
                        </div>
                      </section>
                    ) : null;
                  })}
                  {!customComponents.some((c) => (c.name + c.description).includes(search)) &&
                    !components.some((c) => (c.name + c.description).includes(search)) && (
                    <p className="empty-state">
                      没有找到组件，试试其他关键词。
                    </p>
                  )}
                </>
              ) : (
                <>
                  <h3>选择文档的表达方式</h3>
                  <p className="muted">只改变排版与配色，不会替换正文。</p>
                  <div className="preset-list">
                    {stylePresets.map((preset) => (
                      <button
                        key={preset.id}
                        disabled={busy || uploading}
                        aria-pressed={appearance.theme === preset.id}
                        className={`preset-card ${appearance.theme === preset.id ? "selected" : ""}`}
                        onClick={() =>
                          setDoc({
                            ...doc,
                            appearance: { ...appearance, theme: preset.id },
                          })
                        }
                      >
                        <div
                          className="preset-thumbnail"
                          style={
                            { "--swatch": preset.color } as React.CSSProperties
                          }
                        >
                          <b>Aa</b>
                          <span />
                          <span />
                          <i />
                          <span />
                        </div>
                        <div>
                          <strong>{preset.name}</strong>
                          <small>{preset.description}</small>
                        </div>
                        {appearance.theme === preset.id && <Check size={17} />}
                      </button>
                    ))}
                  </div>
                  <h4 className="component-group">阅读密度</h4>
                  <Radio.Group type="button" name="阅读密度" value={appearance.density} disabled={busy || uploading}
                    options={[{label: "舒适", value: "comfortable"}, {label: "紧凑", value: "compact"}]}
                    onChange={density => setDoc(current => ({...current, appearance: {...appearance, density}}))} />
                  <div className="style-note">
                    <Info size={17} />
                    <p>保存草稿后保留设置，发布后应用到所有绑定项目。</p>
                  </div>
                </>
              )}
            </div>
          </aside>
        )}
      </div>
      <Modal visible={bindingsDraft !== null} title="管理项目绑定" okText="应用绑定" unmountOnExit
        className="workspace-arco-modal editor-config-modal" style={{ width: 720, maxWidth: "calc(100vw - 32px)" }}
        onCancel={() => setBindingsDraft(null)} onOk={() => {
          if (!bindingsDraft?.length) return;
          setDoc(current => ({ ...current, placements: bindingsDraft, projectIds: Array.from(new Set(bindingsDraft.map(p => p.projectId))) }));
          setBindingsDraft(null);
        }} okButtonProps={{ disabled: !bindingsDraft?.length }}>
        <Alert type="info" content="添加或调整目录后点击应用绑定，保存或发布文档后生效。至少保留一个绑定位置。" className="mb-4" />
        {bindingsDraft !== null && <PlacementPicker projects={projects} value={bindingsDraft} onChange={setBindingsDraft} />}
      </Modal>
      <Modal
        visible={customDraft !== null}
        title={customDraft?.id ? "编辑自定义组件" : "添加自定义组件"}
        unmountOnExit
        className="workspace-arco-modal editor-config-modal"
        style={{ width: 620, maxWidth: "calc(100vw - 32px)" }}
        onCancel={() => setCustomDraft(null)}
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-gray-400">
              支持安全排版样式与 Markdown 语法
            </span>
            <div className="flex items-center gap-2">
              <Button onClick={() => setCustomDraft(null)}>取消</Button>
              <Button
                type="secondary"
                disabled={!customDraft?.name?.trim()}
                onClick={() => customDraft && handleSaveCustomComponent(customDraft, false)}
              >
                仅保存组件
              </Button>
              <Button
                type="primary"
                disabled={!customDraft?.name?.trim()}
                onClick={() => customDraft && handleSaveCustomComponent(customDraft, true)}
              >
                保存并插入到文档
              </Button>
            </div>
          </div>
        }
      >
        <Alert
          type="info"
          content="自定义组件将保存在右侧【自定义组件】列表中，支持随时插入到正文光标位置并实时渲染。"
          className="mb-4"
        />
        {customDraft && (
          <Form layout="vertical">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item label="组件名称" required extra="组件在侧边栏卡片显示的标题">
                <Input
                  aria-label="组件名称"
                  value={customDraft.name}
                  placeholder="例如：重点操作说明 / 提示卡片"
                  onChange={(name) => setCustomDraft((curr) => curr && { ...curr, name })}
                />
              </Form.Item>

              <Form.Item label="选择图标" extra="点击方块更换，用于侧边栏卡片与预览">
                <CustomIconSelector
                  value={customDraft.icon}
                  onChange={(icon) => setCustomDraft((curr) => curr && { ...curr, icon })}
                />
              </Form.Item>
            </div>

            <Form.Item label="组件描述" required extra="简短描述组件的作用与使用场景，展示在卡片副标题中">
              <Input.TextArea
                aria-label="组件描述"
                value={customDraft.description}
                autoSize={{ minRows: 2, maxRows: 3 }}
                placeholder="例如：用于高亮标注关键步骤与注意事项，帮助读者快速聚焦"
                onChange={(description) => setCustomDraft((curr) => curr && { ...curr, description })}
              />
            </Form.Item>

            {/* AI 样式助手：非技术用户复制提示词给 AI，由 AI 生成样式 */}
            <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 mb-4">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                  <Sparkles size={13} className="text-[#165dff]" />
                  不会写样式？让 AI 帮你写
                </span>
                <Button size="mini" type="outline" onClick={copyAiStylePrompt}>
                  复制提示词
                </Button>
              </div>
              <p className="text-[11px] text-gray-500 mt-1.5 mb-2">
                填好名称和描述后，复制下方提示词发给任意 AI 助手，把它返回的样式粘贴到「组件样式」输入框即可。
              </p>
              <pre className="m-0 text-[11px] leading-relaxed text-gray-600 bg-white border border-gray-100 rounded p-2 max-h-28 overflow-y-auto whitespace-pre-wrap break-all">
                {aiStylePrompt}
              </pre>
            </div>

            <Form.Item label="组件样式" extra="支持安全的排版样式（如 background、border、border-radius、padding、box-shadow、color 等）">
              <Input.TextArea
                aria-label="组件样式"
                value={customDraft.style || ""}
                autoSize={{ minRows: 2, maxRows: 4 }}
                placeholder="padding: 16px; background-color: #f5f7ff; border: 1px solid #d0e2ff; border-radius: 8px;"
                onChange={(style) => setCustomDraft((curr) => curr && { ...curr, style })}
              />
            </Form.Item>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item label="组件类名" extra="可选，附加在容器上的 CSS 类名（高级用法）">
                <Input
                  aria-label="组件类名"
                  value={customDraft.className || ""}
                  placeholder="例如：my-note (可选)"
                  onChange={(className) => {
                    setCustomDraft((curr) => curr && { ...curr, className });
                  }}
                />
              </Form.Item>

              <Form.Item label="模板同步" extra="修改类名或样式后，点击同步到下方模板代码">
                <Button
                  size="small"
                  type="outline"
                  long
                  onClick={() => {
                    const cls = customDraft.className?.trim() || "custom-box";
                    const sty = customDraft.style?.trim() || "";
                    const newSnippet = `:::styled ${JSON.stringify({ className: cls, style: sty })}\n> 在这里填写【${customDraft.name || "自定义内容"}】的内容。\n:::`;
                    setCustomDraft((curr) => curr && { ...curr, snippet: newSnippet });
                  }}
                >
                  根据样式生成模板
                </Button>
              </Form.Item>
            </div>

            <Form.Item label="模板代码 / 插入内容" required extra="点击卡片插入到编辑器正文中的 Markdown 内容，支持 :::styled 与各类排版语法">
              <Input.TextArea
                aria-label="模板代码"
                value={customDraft.snippet}
                autoSize={{ minRows: 3, maxRows: 5 }}
                placeholder=":::styled ...\n> 在这里填写组件内容\n:::"
                onChange={(snippet) => setCustomDraft((curr) => curr && { ...curr, snippet })}
              />
            </Form.Item>

            {/* 实时效果预览 */}
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/70 mt-2">
              <div className="text-xs font-semibold text-gray-500 mb-2 flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Sparkles size={13} className="text-[#165dff]" /> 实时样式渲染预览</span>
                <span className="text-[11px] text-gray-400 font-normal">正文渲染效果</span>
              </div>
              <div
                className={`doc-styled-container ${customDraft.className || ""}`}
                style={{
                  borderRadius: "8px",
                  padding: "16px",
                  backgroundColor: "#f8f9fc",
                  border: "1px solid #e5e8ef",
                  ...safeComponentStyle(customDraft.style || ""),
                }}
              >
                <div className="flex items-center gap-2 mb-1.5 font-semibold text-gray-800 text-sm">
                  {(() => {
                    const DraftIcon = getIconItem(customDraft.icon)?.icon || icons[customDraft.icon] || Sparkles;
                    return <DraftIcon size={18} className="text-[#165dff]" />;
                  })()}
                  <span>{customDraft.name || "组件标题示例"}</span>
                </div>
                <p className="text-xs text-gray-600 mb-0 leading-relaxed">
                  {customDraft.description || "这里是组件内容的实时渲染效果示例。"}
                </p>
              </div>
            </div>
          </Form>
        )}
      </Modal>
      <Modal
        visible={leavePrompt}
        title="修改尚未保存"
        onCancel={() => setLeavePrompt(false)}
        footer={
          <div className="modal-form-footer">
            <Button onClick={onBack}>放弃修改并离开</Button>
            <Button type="primary" onClick={() => setLeavePrompt(false)}>
              继续编辑
            </Button>
          </div>
        }
        className="workspace-arco-modal"
        style={{ width: 460, maxWidth: "calc(100vw - 32px)" }}
      >
        <p className="form-help">
          离开后，本次未保存的修改将丢失。你可以继续编辑并保存草稿。
        </p>
      </Modal>
      <input
        ref={importInput}
        hidden
        type="file"
        accept=".md,.markdown,.txt"
        onChange={(e) => {
          void importMarkdown(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={imageInput}
        hidden
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        onChange={(e) => {
          void readImage(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </section>
  );
}
