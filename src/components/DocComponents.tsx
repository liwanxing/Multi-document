"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Modal, Message } from "@arco-design/web-react";
import { getIconItem } from "@/lib/iconRegistry";
import {
  Play,
  Copy,
  Check,
  ArrowUpRight,
  Maximize2,
  Film,
  Download,
  Atom,
  Scan,
  FileText,
  Globe,
  Palette,
  Sparkles,
  Code2,
  Database,
  Bot,
  Rocket,
  Shield,
  Settings,
  Zap,
  BarChart3,
  Volume2,
  MessageSquare,
  Star,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

// 1. Navigation Cards (导航卡片组)
export interface CardItem {
  title: string;
  href?: string;
  description: string;
  tag?: string;
}

export function DocCards({
  cols = 3,
  items,
}: {
  cols?: number;
  items: CardItem[];
}) {
  const colClass =
    cols === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : cols === 4
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";

  return (
    <div className={`doc-cards-grid grid ${colClass} gap-4 my-6`}>
      {items.map((item, idx) => {
        const content = (
          <div className="doc-card-inner h-full p-5 rounded-xl border border-gray-200/90 bg-white shadow-none transition-all duration-200 hover:border-blue-500 hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <h4 className="m-0 text-[15px] font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {item.title}
                </h4>
                {item.href && (
                  <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors shrink-0" />
                )}
              </div>
              <p className="m-0 text-[13px] text-gray-500 leading-relaxed">
                {item.description}
              </p>
            </div>
            {item.tag && (
              <div className="mt-3">
                <span className="inline-block px-2 py-0.5 text-[11px] font-medium text-blue-600 bg-blue-50 rounded">
                  {item.tag}
                </span>
              </div>
            )}
          </div>
        );

        if (item.href) {
          const isExternal = /^https?:\/\//i.test(item.href);
          return isExternal ? (
            <a
              key={idx}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="doc-card-link no-underline hover:no-underline focus:no-underline block h-full focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-xl"
              style={{ textDecoration: "none" }}
            >
              {content}
            </a>
          ) : (
            <Link
              key={idx}
              href={item.href}
              className="doc-card-link no-underline hover:no-underline focus:no-underline block h-full focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-xl"
              style={{ textDecoration: "none" }}
            >
              {content}
            </Link>
          );
        }

        return (
          <div key={idx} className="h-full">
            {content}
          </div>
        );
      })}
    </div>
  );
}

// 2. Feature / Highlight Cards (特性亮点卡片组)
export interface FeatureItem {
  title: string;
  html: string;
}

export function DocFeatures({
  cols = 3,
  items,
}: {
  cols?: number;
  items: FeatureItem[];
}) {
  const colClass =
    cols === 2
      ? "grid-cols-1 md:grid-cols-2"
      : cols === 4
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={`doc-features-grid grid ${colClass} gap-4 my-6`}>
      {items.map((item, idx) => (
        <div
          key={idx}
          className="doc-feature-card p-5 rounded-xl border border-gray-200/90 bg-white shadow-none transition-shadow hover:shadow-sm"
        >
          <h4 className="m-0 mb-3 text-[15px] font-semibold text-[#165dff] tracking-tight">
            {item.title}
          </h4>
          <div
            className="doc-feature-content text-[13px] text-gray-600 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: item.html }}
          />
        </div>
      ))}
    </div>
  );
}

// 3. Prompt & Output Preview (提示词生图对比)
export function DocPromptPreview({
  promptTitle = "提示词",
  promptText,
  previewTitle = "输出预览",
  previewHtml,
  previewSrc,
  onZoom,
}: {
  promptTitle?: string;
  promptText: string;
  previewTitle?: string;
  previewHtml?: string;
  previewSrc?: string;
  onZoom?: (src: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    Message.success({ content: "已复制提示词", duration: 1800 });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="doc-prompt-preview my-6">
      {/* Header bar with divider */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2.5 mb-3.5 border-b border-gray-200 text-sm font-semibold text-gray-800">
        <div>{promptTitle}</div>
        <div className="hidden md:block">{previewTitle}</div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left: Prompt text box */}
        <div className="relative group p-4 rounded-xl border border-gray-200/80 bg-gray-50/50 text-gray-700 text-[13px] leading-relaxed select-text">
          <button
            type="button"
            onClick={handleCopy}
            className="absolute top-3 right-3 p-1.5 rounded-lg border border-gray-200 bg-white shadow-xs text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors flex items-center gap-1 text-xs"
            title="复制提示词"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 text-[11px]">已复制</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-[11px]">复制</span>
              </>
            )}
          </button>
          <div className="pr-16 whitespace-pre-wrap">{promptText}</div>
        </div>

        {/* Right: Output preview */}
        <div>
          <div className="block md:hidden mb-2 text-sm font-semibold text-gray-800">
            {previewTitle}
          </div>
          {previewSrc ? (
            <div
              className="rounded-xl overflow-hidden border border-gray-200/80 bg-gray-100/50 cursor-zoom-in group relative"
              onClick={() => onZoom?.(previewSrc)}
            >
              <img
                src={previewSrc}
                alt="输出预览"
                className="w-full h-auto object-cover rounded-xl transition-transform duration-200 group-hover:scale-[1.01]"
              />
              <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <Maximize2 className="w-3.5 h-3.5" />
              </div>
            </div>
          ) : (
            <div
              className="doc-preview-container rounded-xl overflow-hidden border border-gray-200/80 bg-gray-50/40 p-2"
              dangerouslySetInnerHTML={{ __html: previewHtml || "" }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// 4. Video & Media Grid (视频媒体网格)
export interface MediaGridItem {
  title?: string;
  src: string;
  poster?: string;
  isVideo: boolean;
}

export function DocVideoGrid({
  cols = 3,
  items,
  onZoom,
}: {
  cols?: number;
  items: MediaGridItem[];
  onZoom?: (src: string) => void;
}) {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  const colClass =
    cols === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : cols === 4
        ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
        : "grid-cols-2 sm:grid-cols-3";

  return (
    <div className={`doc-video-grid grid ${colClass} gap-3 my-4`}>
      {items.map((item, idx) => {
        return (
          <div
            key={idx}
            className="group relative aspect-[16/10] rounded-lg overflow-hidden border border-gray-200/90 bg-gray-100 cursor-pointer shadow-none hover:shadow-md transition-all duration-200"
            onClick={() => {
              if (item.isVideo) {
                setActiveVideo(item.src);
              } else {
                onZoom?.(item.src);
              }
            }}
          >
            {/* Thumbnail Image */}
            <img
              src={item.poster || item.src}
              alt={item.title || `媒体素材 ${idx + 1}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />

            {/* Video Play Overlay */}
            {item.isVideo && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/35 transition-colors">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-white shadow-lg transition-transform duration-200 group-hover:scale-110 group-hover:bg-blue-600/80">
                  <Play className="w-5 h-5 fill-white ml-0.5" />
                </div>
              </div>
            )}

            {/* Caption tooltip / bottom title */}
            {item.title && (
              <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/75 to-transparent text-white text-[11px] truncate opacity-90 group-hover:opacity-100 transition-opacity">
                {item.title}
              </div>
            )}
          </div>
        );
      })}

      {/* Video Modal Player */}
      <Modal
        visible={!!activeVideo}
        footer={null}
        simple
        autoFocus={false}
        focusLock={false}
        unmountOnExit
        onCancel={() => setActiveVideo(null)}
        className="video-player-modal"
        style={{ width: "90%", maxWidth: 840, padding: 0 }}
      >
        {activeVideo && (
          <div className="bg-black rounded-lg overflow-hidden">
            <video
              src={activeVideo}
              controls
              autoPlay
              className="w-full max-h-[75vh] object-contain rounded-lg"
            >
              您的浏览器不支持视频播放。
            </video>
          </div>
        )}
      </Modal>
    </div>
  );
}

// 5. Multimodal Showcase (多模态生成展示)
export function DocMultimodal({
  inputTitle = "输入",
  inputNode,
  outputTitle = "输出",
  outputNode,
}: {
  inputTitle?: string;
  inputNode: React.ReactNode;
  outputTitle?: string;
  outputNode: React.ReactNode;
}) {
  return (
    <div className="doc-multimodal my-6">
      {/* Header Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-2.5 mb-4 border-b border-gray-200 text-sm font-semibold text-gray-800">
        <div className="lg:col-span-5">{inputTitle}</div>
        <div className="hidden lg:block lg:col-span-7">{outputTitle}</div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Input Assets */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          {inputNode}
        </div>

        {/* Right: Output Showcase */}
        <div className="lg:col-span-7">
          <div className="block lg:hidden mb-2 text-sm font-semibold text-gray-800">
            {outputTitle}
          </div>
          {outputNode}
        </div>
      </div>
    </div>
  );
}

// 6. Storyboard & Script Showcase (分镜脚本展示)
export interface StoryboardAsset {
  title?: string;
  src: string;
}

export function DocStoryboard({
  scriptTitle = "Plain",
  scriptText,
  mainImageSrc,
  mainImageAlt = "故事板分镜",
  assets = [],
  onZoom,
}: {
  scriptTitle?: string;
  scriptText: string;
  mainImageSrc: string;
  mainImageAlt?: string;
  assets: StoryboardAsset[];
  onZoom?: (src: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(scriptText);
    setCopied(true);
    Message.success({ content: "已复制脚本", duration: 1800 });
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = scriptText.split("\n").filter((l) => l.trim().length > 0);

  return (
    <div className="doc-storyboard my-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Left Column: Numbered Script */}
      <div className="lg:col-span-7 rounded-xl border border-gray-200/90 bg-white shadow-xs overflow-hidden flex flex-col">
        {/* Script Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/70 border-b border-gray-100 text-xs text-gray-500">
          <span className="font-mono font-medium text-gray-600">{scriptTitle}</span>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 text-gray-500 hover:text-blue-600 transition-colors p-1 rounded"
            title="复制脚本"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 text-[11px]">已复制</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-[11px]">复制</span>
              </>
            )}
          </button>
        </div>

        {/* Script Body with Line Numbers */}
        <div className="p-4 overflow-x-auto text-[13px] leading-relaxed">
          <table className="border-collapse border-0 w-full m-0">
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                  <td className="align-top text-right pr-4 py-0.5 text-gray-400 font-mono text-xs select-none w-8 min-w-[2rem] border-0">
                    {idx + 1}
                  </td>
                  <td className="align-top py-0.5 text-gray-700 whitespace-pre-wrap font-sans border-0 break-words">
                    {line}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Column: Main Storyboard + Asset Strip */}
      <div className="lg:col-span-5 flex flex-col gap-3">
        {/* Main Storyboard Image */}
        {mainImageSrc && (
          <div
            className="rounded-lg overflow-hidden border-2 border-blue-500/90 bg-gray-50 cursor-zoom-in group relative shadow-xs"
            onClick={() => onZoom?.(mainImageSrc)}
          >
            <img
              src={mainImageSrc}
              alt={mainImageAlt}
              className="w-full h-auto object-cover transition-transform duration-200 group-hover:scale-[1.01]"
            />
            <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <Maximize2 className="w-3.5 h-3.5" />
            </div>
          </div>
        )}

        {/* Reference Assets Horizontal Strip */}
        {assets.length > 0 && (
          <div className="grid grid-cols-5 gap-2 pt-1">
            {assets.map((asset, idx) => (
              <div
                key={idx}
                className="aspect-square rounded-md overflow-hidden border border-gray-200 bg-gray-50 cursor-zoom-in group relative shadow-none hover:shadow-xs transition-all hover:border-blue-400"
                onClick={() => onZoom?.(asset.src)}
                title={asset.title || `素材 ${idx + 1}`}
              >
                <img
                  src={asset.src}
                  alt={asset.title || `素材 ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 7. Keyframe Sequence Gallery (关键帧画廊)
export interface KeyframeItem {
  title?: string;
  src: string;
}

export function DocKeyframes({
  prompt,
  items = [],
  cols = 4,
  onZoom,
}: {
  prompt?: string;
  items: KeyframeItem[];
  cols?: number;
  onZoom?: (src: string) => void;
}) {
  const colClass =
    cols === 3
      ? "grid-cols-2 sm:grid-cols-3"
      : cols === 5
        ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-5"
        : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4";

  return (
    <div className="doc-keyframes my-6">
      {/* Prompt Callout */}
      {prompt && (
        <div className="flex items-start gap-2 text-[13px] text-gray-700 leading-relaxed mb-3.5">
          <span className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0 inline-block" />
          <div className="prose-clean">
            <span className="font-semibold text-gray-800 mr-1.5">示例:</span>
            <span>{prompt}</span>
          </div>
        </div>
      )}

      {/* Keyframe Images Matrix */}
      <div className={`grid ${colClass} gap-3`}>
        {items.map((item, idx) => (
          <div
            key={idx}
            className="group relative aspect-[16/10] rounded-lg overflow-hidden border border-gray-200 bg-gray-50 cursor-zoom-in shadow-none hover:shadow-md transition-all duration-200 hover:border-blue-400"
            onClick={() => onZoom?.(item.src)}
          >
            <img
              src={item.src}
              alt={item.title || `关键帧 ${idx + 1}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {/* Index / Label badge */}
            <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium opacity-85 group-hover:opacity-100 transition-opacity">
              {item.title || `图片 ${idx + 1}`}
            </div>
            <div className="absolute top-1.5 right-1.5 p-1 rounded bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <Maximize2 className="w-3 h-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 8. File Attachment Card (附件下载卡片)
export function DocFileAttachment({
  name,
  url,
  size,
}: {
  name: string;
  url: string;
  size?: string;
}) {
  return (
    <div className="doc-file-card-wrapper my-3 inline-block">
      <a
        href={url}
        download={name}
        target="_blank"
        rel="noopener noreferrer"
        className="doc-file-card inline-flex items-center gap-3.5 px-4 py-3 rounded-lg border border-gray-200 bg-white hover:border-blue-400 hover:shadow-xs transition-all no-underline hover:no-underline focus:no-underline group text-gray-800"
        style={{ textDecoration: "none" }}
      >
        {/* Blue Document Icon */}
        <div className="w-8 h-9 rounded-md bg-gradient-to-b from-blue-500 to-blue-600 text-white flex flex-col items-center justify-center shrink-0 shadow-xs relative overflow-hidden">
          <div className="w-3 h-0.5 bg-white/80 rounded-full mb-1" />
          <div className="w-4 h-0.5 bg-white/80 rounded-full mb-1" />
          <div className="w-2.5 h-0.5 bg-white/70 rounded-full" />
        </div>

        {/* Filename & Info */}
        <div className="min-w-0 pr-2">
          <div
            className="text-[13px] font-medium text-gray-800 group-hover:text-blue-600 transition-colors truncate max-w-[220px] sm:max-w-[320px] no-underline"
            style={{ textDecoration: "none" }}
          >
            {name}
          </div>
          {size && (
            <div
              className="text-[11px] text-gray-400 mt-0.5 no-underline"
              style={{ textDecoration: "none" }}
            >
              {size}
            </div>
          )}
        </div>

        {/* Download Action Icon */}
        <div className="text-blue-500 pl-1 shrink-0 group-hover:translate-y-0.5 transition-transform">
          <Download className="w-4 h-4" />
        </div>
      </a>
    </div>
  );
}

// 9. Banner Cards (大图模型卡片组) - matching media_1790135420182.png
export interface BannerCardItem {
  title: string;
  href?: string;
  image: string;
  subtitle?: string;
  description?: string;
  tag?: string;
}

export function DocBannerCards({
  cols = 3,
  items,
}: {
  cols?: number;
  items: BannerCardItem[];
}) {
  const colClass =
    cols === 2
      ? "grid-cols-1 md:grid-cols-2"
      : cols === 4
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={`doc-banner-cards-grid grid ${colClass} gap-5 my-6`}>
      {items.map((item, idx) => {
        const cardContent = (
          <div className="doc-banner-card h-full p-3.5 sm:p-4 rounded-xl border border-gray-200/90 bg-white hover:border-blue-500 hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
            <div>
              {/* Banner Image */}
              <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-gray-900 mb-3.5">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                {item.tag && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 text-[11px] font-medium text-white bg-black/60 backdrop-blur-xs rounded-full">
                    {item.tag}
                  </span>
                )}
              </div>

              {/* Title */}
              <h4
                className="m-0 text-[16px] font-semibold text-gray-900 group-hover:text-blue-600 transition-colors flex items-center justify-between gap-1 no-underline"
                style={{ textDecoration: "none" }}
              >
                <span className="no-underline" style={{ textDecoration: "none" }}>{item.title}</span>
                {item.href && (
                  <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 shrink-0 opacity-0 group-hover:opacity-100 transition-all no-underline" />
                )}
              </h4>

              {/* Subtitle */}
              {item.subtitle && (
                <p
                  className="mt-1.5 mb-1 text-[13px] font-medium text-gray-600 line-clamp-1 no-underline"
                  style={{ textDecoration: "none" }}
                >
                  {item.subtitle}
                </p>
              )}

              {/* Description */}
              {item.description && (
                <p
                  className="m-0 text-[13px] text-gray-500 line-clamp-2 leading-relaxed no-underline"
                  style={{ textDecoration: "none" }}
                >
                  {item.description}
                </p>
              )}
            </div>
          </div>
        );

        if (item.href) {
          const isExternal = /^https?:\/\//i.test(item.href);
          return isExternal ? (
            <a
              key={idx}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="doc-banner-card-link no-underline hover:no-underline focus:no-underline block h-full focus:outline-none"
              style={{ textDecoration: "none" }}
            >
              {cardContent}
            </a>
          ) : (
            <Link
              key={idx}
              href={item.href}
              className="doc-banner-card-link no-underline hover:no-underline focus:no-underline block h-full focus:outline-none"
              style={{ textDecoration: "none" }}
            >
              {cardContent}
            </Link>
          );
        }

        return (
          <div key={idx} className="h-full">
            {cardContent}
          </div>
        );
      })}
    </div>
  );
}

// 10. Capability Matrix Grid (基础使用与功能特性列表) - matching media_1790135470675.png
export interface CapabilityItem {
  icon?: string;
  title: string;
  href?: string;
  description: string;
}

export function DocCapabilities({
  title,
  description,
  items,
}: {
  title?: string;
  description?: string;
  items: CapabilityItem[];
}) {
  const renderIcon = (type?: string) => {
    const raw = (type || "").trim();
    const key = raw.toLowerCase();

    // 1. If it's a custom image URL or Markdown image: ![alt](url)
    let imageUrl = "";
    const mdImgMatch = /!\[.*?\]\((.*?)\)/.exec(raw);
    if (mdImgMatch) {
      imageUrl = mdImgMatch[1].trim();
    } else if (
      /^(https?:\/\/|\/|data:image)/i.test(raw) ||
      /\.(png|jpe?g|svg|webp|gif|ico)(\?.*)?$/i.test(raw)
    ) {
      imageUrl = raw;
    }

    if (imageUrl) {
      return (
        <div className="w-11 h-11 rounded-xl bg-blue-50/80 flex items-center justify-center shrink-0 overflow-hidden p-2 border border-blue-100/60 shadow-2xs">
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLElement).style.display = "none";
            }}
          />
        </div>
      );
    }

    // 2. Check unified icon registry first (supports ID, Chinese name, or aliases)
    const clean = raw.replace(/^\[icon:/i, "").replace(/\]$/, "").trim();
    const registryItem = getIconItem(clean);
    if (registryItem) {
      const IconCmp = registryItem.icon;
      return (
        <div
          className={`w-11 h-11 rounded-xl ${registryItem.bgClass || "bg-blue-50/80"} flex items-center justify-center shrink-0 ${registryItem.colorClass || "text-[#165dff]"} border border-blue-100/60 shadow-2xs`}
        >
          <IconCmp className="w-5 h-5 text-[20px]" style={{ width: 20, height: 20, fontSize: 20 }} />
        </div>
      );
    }

    // 3. Built-in keywords fallback (Supports Chinese & English):
    // 深度思考 / 思考 / 推理 / atom / think
    if (
      key.includes("思考") ||
      key.includes("think") ||
      key.includes("推理") ||
      key.includes("atom") ||
      key.includes("reasoning")
    ) {
      return (
        <div className="w-11 h-11 rounded-xl bg-blue-50/80 flex items-center justify-center shrink-0 text-[#165dff]">
          <Atom className="w-5 h-5" />
        </div>
      );
    }

    // 图片理解 / 识图 / 视觉 / image-scan / vision
    if (
      key.includes("图片理解") ||
      key.includes("识图") ||
      key.includes("视觉") ||
      key.includes("看图") ||
      key === "image-scan" ||
      key === "image-understanding" ||
      key === "vision"
    ) {
      return (
        <div className="w-11 h-11 rounded-xl bg-blue-50/80 flex items-center justify-center shrink-0 text-[#165dff]">
          <div className="relative flex items-center justify-center">
            <Scan className="w-5 h-5" />
            <Palette className="w-2.5 h-2.5 absolute" />
          </div>
        </div>
      );
    }

    // 视频理解 / 识别视频 / video-scan
    if (
      key.includes("视频理解") ||
      key.includes("看视频") ||
      key === "video-scan" ||
      key === "video-understanding"
    ) {
      return (
        <div className="w-11 h-11 rounded-xl bg-blue-50/80 flex items-center justify-center shrink-0 text-[#165dff]">
          <div className="relative flex items-center justify-center">
            <Scan className="w-5 h-5" />
            <Play className="w-2.5 h-2.5 fill-current absolute ml-0.5" />
          </div>
        </div>
      );
    }

    // 文档理解 / 文档 / pdf / 文件 / doc / document
    if (
      key.includes("文档") ||
      key.includes("pdf") ||
      key.includes("文件") ||
      key === "doc" ||
      key === "document" ||
      key === "folder"
    ) {
      return (
        <div className="w-11 h-11 rounded-xl bg-blue-50/80 flex items-center justify-center shrink-0 text-[#165dff]">
          <div className="relative flex items-center justify-center">
            <Scan className="w-5 h-5" />
            <FileText className="w-2.5 h-2.5 absolute" />
          </div>
        </div>
      );
    }

    // 视频生成 / 文生视频 / 图生视频 / 视频 / video-play / video-gen / video
    if (
      key.includes("视频生成") ||
      key.includes("文生视频") ||
      key.includes("图生视频") ||
      key === "video-play" ||
      key === "video-gen" ||
      key === "video" ||
      key === "视频"
    ) {
      return (
        <div className="w-11 h-11 rounded-xl bg-purple-50/80 flex items-center justify-center shrink-0 text-[#7933ff]">
          <div className="w-6 h-6 rounded-md bg-[#7933ff] text-white flex items-center justify-center shadow-2xs">
            <Play className="w-3 h-3 fill-white ml-0.5" />
          </div>
        </div>
      );
    }

    // 图片生成 / 文生图 / 绘图 / 图像 / 生图 / image-gen / palette
    if (
      key.includes("图片生成") ||
      key.includes("文生图") ||
      key.includes("生图") ||
      key.includes("绘图") ||
      key.includes("画画") ||
      key === "image-gen" ||
      key === "image" ||
      key === "palette" ||
      key === "图片"
    ) {
      return (
        <div className="w-11 h-11 rounded-xl bg-purple-50/80 flex items-center justify-center shrink-0 text-[#7933ff]">
          <Palette className="w-5 h-5" />
        </div>
      );
    }

    // 联网搜索 / 搜索 / 联网 / 网络 / 网页 / search / web / globe
    if (
      key.includes("搜索") ||
      key.includes("联网") ||
      key.includes("网络") ||
      key.includes("网页") ||
      key === "search" ||
      key === "web" ||
      key === "globe"
    ) {
      return (
        <div className="w-11 h-11 rounded-xl bg-blue-50/80 flex items-center justify-center shrink-0 text-[#165dff]">
          <Globe className="w-5 h-5" />
        </div>
      );
    }

    // 函数调用 / 函数 / 工具 / api / function / tool / fx
    if (
      key.includes("函数") ||
      key.includes("工具") ||
      key.includes("api") ||
      key.includes("插件") ||
      key === "function" ||
      key === "tool" ||
      key === "fx"
    ) {
      return (
        <div className="w-11 h-11 rounded-xl bg-blue-50/80 flex items-center justify-center shrink-0 text-[#165dff]">
          <span className="text-[17px] font-bold italic font-serif leading-none select-none">
            fx
          </span>
        </div>
      );
    }

    // 代码 / 编程 / 开发 / code / terminal
    if (
      key.includes("代码") ||
      key.includes("开发") ||
      key.includes("编程") ||
      key === "code" ||
      key === "terminal"
    ) {
      return (
        <div className="w-11 h-11 rounded-xl bg-blue-50/80 flex items-center justify-center shrink-0 text-[#165dff]">
          <Code2 className="w-5 h-5" />
        </div>
      );
    }

    // 数据库 / 数据 / database / data
    if (
      key.includes("数据") ||
      key.includes("存储") ||
      key === "database" ||
      key === "data"
    ) {
      return (
        <div className="w-11 h-11 rounded-xl bg-blue-50/80 flex items-center justify-center shrink-0 text-[#165dff]">
          <Database className="w-5 h-5" />
        </div>
      );
    }

    // 机器人 / 智能体 / agent / bot
    if (
      key.includes("机器人") ||
      key.includes("智能体") ||
      key === "agent" ||
      key === "bot"
    ) {
      return (
        <div className="w-11 h-11 rounded-xl bg-blue-50/80 flex items-center justify-center shrink-0 text-[#165dff]">
          <Bot className="w-5 h-5" />
        </div>
      );
    }

    // 火箭 / 快速入门 / 发布 / rocket / launch
    if (
      key.includes("火箭") ||
      key.includes("入门") ||
      key.includes("发布") ||
      key === "rocket" ||
      key === "launch"
    ) {
      return (
        <div className="w-11 h-11 rounded-xl bg-blue-50/80 flex items-center justify-center shrink-0 text-[#165dff]">
          <Rocket className="w-5 h-5" />
        </div>
      );
    }

    // 安全 / 权限 / 风控 / shield / security
    if (
      key.includes("安全") ||
      key.includes("权限") ||
      key.includes("风控") ||
      key === "shield" ||
      key === "security"
    ) {
      return (
        <div className="w-11 h-11 rounded-xl bg-blue-50/80 flex items-center justify-center shrink-0 text-[#165dff]">
          <Shield className="w-5 h-5" />
        </div>
      );
    }

    // 设置 / 配置 / 管理 / settings / config
    if (
      key.includes("设置") ||
      key.includes("配置") ||
      key.includes("管理") ||
      key === "settings" ||
      key === "config"
    ) {
      return (
        <div className="w-11 h-11 rounded-xl bg-blue-50/80 flex items-center justify-center shrink-0 text-[#165dff]">
          <Settings className="w-5 h-5" />
        </div>
      );
    }

    // 极速 / 性能 / 实时 / zap / speed / fast
    if (
      key.includes("极速") ||
      key.includes("性能") ||
      key.includes("闪电") ||
      key === "zap" ||
      key === "speed"
    ) {
      return (
        <div className="w-11 h-11 rounded-xl bg-blue-50/80 flex items-center justify-center shrink-0 text-[#165dff]">
          <Zap className="w-5 h-5" />
        </div>
      );
    }

    // 分析 / 统计 / 图表 / chart / analytics
    if (
      key.includes("分析") ||
      key.includes("统计") ||
      key.includes("图表") ||
      key === "chart" ||
      key === "analytics"
    ) {
      return (
        <div className="w-11 h-11 rounded-xl bg-blue-50/80 flex items-center justify-center shrink-0 text-[#165dff]">
          <BarChart3 className="w-5 h-5" />
        </div>
      );
    }

    // 语音 / 音频 / 声音 / audio / voice / mic
    if (
      key.includes("语音") ||
      key.includes("音频") ||
      key.includes("声音") ||
      key === "audio" ||
      key === "voice" ||
      key === "mic"
    ) {
      return (
        <div className="w-11 h-11 rounded-xl bg-blue-50/80 flex items-center justify-center shrink-0 text-[#165dff]">
          <Volume2 className="w-5 h-5" />
        </div>
      );
    }

    // 对话 / 问答 / 聊天 / chat / message
    if (
      key.includes("对话") ||
      key.includes("问答") ||
      key.includes("聊天") ||
      key === "chat" ||
      key === "message"
    ) {
      return (
        <div className="w-11 h-11 rounded-xl bg-blue-50/80 flex items-center justify-center shrink-0 text-[#165dff]">
          <MessageSquare className="w-5 h-5" />
        </div>
      );
    }

    // 星标 / 推荐 / 核心 / star
    if (
      key.includes("星标") ||
      key.includes("推荐") ||
      key.includes("核心") ||
      key === "star"
    ) {
      return (
        <div className="w-11 h-11 rounded-xl bg-amber-50/80 flex items-center justify-center shrink-0 text-amber-500">
          <Star className="w-5 h-5 fill-amber-500" />
        </div>
      );
    }

    // Default: Sparkles
    return (
      <div className="w-11 h-11 rounded-xl bg-blue-50/80 flex items-center justify-center shrink-0 text-[#165dff]">
        <Sparkles className="w-5 h-5" />
      </div>
    );
  };

  return (
    <div className="doc-capabilities-wrapper my-8">
      {/* Header */}
      {(title || description) && (
        <div className="mb-5">
          {title && (
            <h3 className="m-0 text-[18px] sm:text-[20px] font-bold text-gray-900 tracking-tight">
              {title}
            </h3>
          )}
          {description && (
            <p className="mt-1.5 mb-0 text-[13px] sm:text-[14px] text-gray-500 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      )}

      {/* 2-Column Capability Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
        {items.map((item, idx) => {
          const itemContent = (
            <div className="doc-cap-item flex items-center gap-3.5 p-3 rounded-xl hover:bg-[#f7f8fa] transition-colors group cursor-pointer">
              {renderIcon(item.icon)}
              <div className="min-w-0 flex-1">
                <div
                  className="text-[15px] font-semibold text-gray-900 group-hover:text-blue-600 transition-colors flex items-center gap-1.5 no-underline"
                  style={{ textDecoration: "none" }}
                >
                  <span className="no-underline" style={{ textDecoration: "none" }}>{item.title}</span>
                  {item.href && (
                    <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all shrink-0 no-underline" />
                  )}
                </div>
                <div
                  className="text-[13px] text-gray-500 mt-0.5 line-clamp-1 no-underline"
                  style={{ textDecoration: "none" }}
                >
                  {item.description}
                </div>
              </div>
            </div>
          );

          if (item.href) {
            const isExternal = /^https?:\/\//i.test(item.href);
            return isExternal ? (
              <a
                key={idx}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="doc-cap-link no-underline hover:no-underline focus:no-underline block focus:outline-none"
                style={{ textDecoration: "none" }}
              >
                {itemContent}
              </a>
            ) : (
              <Link
                key={idx}
                href={item.href}
                className="doc-cap-link no-underline hover:no-underline focus:no-underline block focus:outline-none"
                style={{ textDecoration: "none" }}
              >
                {itemContent}
              </Link>
            );
          }

          return <div key={idx}>{itemContent}</div>;
        })}
      </div>
    </div>
  );
}

// 11. Pro Data Table (规范数据/变更说明表格) - matching media_1790135602069.png
export function DocProTable({
  headers,
  rows,
  aligns = [],
}: {
  headers: string[];
  rows: string[][];
  aligns?: ("left" | "center" | "right")[];
}) {
  return (
    <div className="doc-pro-table-wrapper my-6 overflow-hidden rounded-lg border border-[#e5edf8] shadow-2xs">
      <div className="overflow-x-auto">
        <table className="doc-pro-table w-full border-collapse text-[13px] sm:text-[14px]">
          <thead>
            <tr className="bg-[#f2f6fd] border-b border-[#e5edf8]">
              {headers.map((h, idx) => (
                <th
                  key={idx}
                  className={`py-3 px-4 font-semibold text-[#1d2129] border-r border-[#e5edf8] last:border-r-0 whitespace-nowrap ${
                    aligns[idx] === "right"
                      ? "text-right"
                      : aligns[idx] === "center"
                        ? "text-center"
                        : "text-left"
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eef3f9] bg-white">
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-[#f9fbff] transition-colors">
                {row.map((cell, cIdx) => (
                  <td
                    key={cIdx}
                    className={`py-3 px-4 text-[#4e5969] border-r border-[#eef3f9] last:border-r-0 leading-relaxed ${
                      cIdx === 0 ? "font-medium text-[#1d2129]" : ""
                    } ${
                      aligns[cIdx] === "right"
                        ? "text-right font-mono"
                        : aligns[cIdx] === "center"
                          ? "text-center"
                          : "text-left"
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 12. API Explorer Card (API Explorer 在线调试卡片) - matching media_1790761077830.png
export function DocApiExplorer({
  title = "API Explorer",
  description = "您可以通过 API Explorer 在线发起调用，无需关注签名生成过程，快速获取调用结果。",
  buttonText = "去调试",
  href = "https://example.com/请替换为API调试地址",
}: {
  title?: string;
  description?: string;
  buttonText?: string;
  href?: string;
}) {
  const isExternal = /^https?:\/\//i.test(href);

  const buttonInner = (
    <>
      <svg
        className="w-[15px] h-[15px] shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 10a7.31 7.31 0 0 0 10 10Z" />
        <path d="m9 15 3-3" />
        <path d="M17 13a6 6 0 0 0-6-6" />
        <path d="M21 13A10 10 0 0 0 11 3" />
        <path d="M4.5 19.5h5" />
      </svg>
      <span>{buttonText}</span>
    </>
  );

  const btnClassName =
    "doc-api-explorer-btn inline-flex items-center justify-center gap-1.5 h-[33px] px-3.5 rounded-[4px] bg-[#4465ff] hover:bg-[#3455eb] active:bg-[#2947d6] !text-white text-[13px] font-normal leading-none whitespace-nowrap select-none transition-colors no-underline hover:no-underline cursor-pointer";

  return (
    <div className="doc-api-explorer-card my-6 rounded-[8px] border border-[#eaedf1] bg-[#fafbfc] px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="text-[16px] font-bold text-[#0b0c0e] leading-6 tracking-tight">
          {title}
        </div>
        {description && (
          <div className="mt-2.5 text-[13px] text-[#474b53] leading-5 font-normal">
            {description}
          </div>
        )}
      </div>
      <div className="shrink-0 sm:self-center">
        {isExternal ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={btnClassName}
            style={{ color: "#ffffff", textDecoration: "none" }}
          >
            {buttonInner}
          </a>
        ) : (
          <Link
            href={href || "#"}
            className={btnClassName}
            style={{ color: "#ffffff", textDecoration: "none" }}
          >
            {buttonInner}
          </Link>
        )}
      </div>
    </div>
  );
}

// 13. API Parameters Accordion List (请求参数折叠列表) - matching media_1790762310647.png
export interface ApiParamItem {
  name: string;
  type?: string;
  required?: string;
  badge?: string;
  summary?: string;
  defaultOpen?: boolean;
  descriptionHtml?: string;
  descriptionRaw?: string;
  descriptionNode?: React.ReactNode;
}

export function DocApiParams({
  title,
  subtitle,
  items,
}: {
  title?: string;
  subtitle?: string;
  items: ApiParamItem[];
}) {
  const [openMap, setOpenMap] = useState<Record<number, boolean>>(() => {
    const init: Record<number, boolean> = {};
    items.forEach((item, idx) => {
      init[idx] = item.defaultOpen === true;
    });
    return init;
  });

  const toggleItem = (idx: number) => {
    setOpenMap((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="doc-api-params my-6">
      {title && (
        <div className="text-[20px] font-bold text-[#1d2129] mb-4 leading-snug tracking-tight">
          {title}
        </div>
      )}
      {subtitle && (
        <div className="text-[15px] font-bold text-[#1d2129] mb-3.5 leading-snug">
          {subtitle}
        </div>
      )}

      <div className="doc-api-param-list border-t border-[#eaedf1]">
        {items.map((item, idx) => {
          const isOpen = !!openMap[idx];
          return (
            <div key={`${item.name}-${idx}`} className="doc-api-param-row border-b border-[#eaedf1]">
              <button
                type="button"
                onClick={() => toggleItem(idx)}
                className="doc-api-param-toggle w-full py-3.5 px-1 flex items-center flex-wrap gap-2 text-left cursor-pointer select-none hover:bg-[#fafbfc] transition-colors bg-transparent border-0"
              >
                {isOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-[#4e5969] shrink-0" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-[#4e5969] shrink-0" />
                )}

                <span className="inline-flex items-start text-[14px] font-medium text-[#1d2129] leading-5">
                  <span>{item.name}</span>
                  {item.badge && (
                    <span className="doc-api-param-badge inline-flex items-center px-1 py-0 text-[11px] font-semibold leading-[15px] bg-[#f9ff01] text-[#1d2129] rounded-[2px] -translate-y-1 ml-0.5">
                      {item.badge}
                    </span>
                  )}
                </span>

                {item.type && (
                  <span className="doc-api-param-tag inline-flex items-center px-2 py-0.5 rounded-[4px] bg-[#f4f5f6] text-[#476583] text-[12px] leading-5 font-mono">
                    {item.type}
                  </span>
                )}

                {item.required && (
                  <span className="doc-api-param-tag inline-flex items-center px-2 py-0.5 rounded-[4px] bg-[#f4f5f6] text-[#476583] text-[12px] leading-5 font-mono">
                    {item.required}
                  </span>
                )}

                {item.summary && (
                  <>
                    <span className="text-[#86909c] text-[13px] mx-0.5 font-normal">
                      |
                    </span>
                    <span className="text-[14px] text-[#4e5969] font-normal leading-5">
                      {item.summary}
                    </span>
                  </>
                )}
              </button>

              {isOpen && (item.descriptionNode || item.descriptionHtml) && (
                <div className="doc-api-param-desc pl-6 pr-2 pb-4 pt-0.5 text-[14px] text-[#4e5969] leading-7">
                  {item.descriptionNode ? (
                    item.descriptionNode
                  ) : (
                    <div
                      className="space-y-2.5"
                      dangerouslySetInnerHTML={{ __html: item.descriptionHtml! }}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
