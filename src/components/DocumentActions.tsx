"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Dropdown,
  Menu,
  Popover,
  Message,
  Button,
  Tooltip,
} from "@arco-design/web-react";
import {
  IconCopy,
  IconDown,
  IconStar,
  IconStarFill,
  IconLink,
} from "@arco-design/web-react/icon";
import { readFavorites, writeFavorites, type Favorite } from "@/lib/favorites";
import { writeClipboard } from "@/lib/clipboard";
import ThemeModeSwitch from "@/components/ThemeModeSwitch";

// Share tray icon (box with upward arrow) matching reference screenshot
function ShareTrayIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 10.5V15a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-4.5" />
      <polyline points="6.5 6 10 2.5 13.5 6" />
      <line x1="10" y1="2.5" x2="10" y2="12" />
    </svg>
  );
}

// Blue WeChat bubbles icon matching reference screenshot popover
function WechatIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8.5 3C4.36 3 1 5.91 1 9.5c0 2.06 1.05 3.89 2.7 5.1-.12.44-.45 1.63-.52 1.89-.08.31.11.31.24.22.17-.11 2.37-1.6 2.75-1.85.73.21 1.5.33 2.33.33.2 0 .4-.01.6-.03-.25-.56-.39-1.18-.39-1.83 0-3.1 2.91-5.63 6.5-5.63.42 0 .82.04 1.22.11C15.63 5.09 12.35 3 8.5 3zm-2.25 4c.69 0 1.25.56 1.25 1.25S6.94 9.5 6.25 9.5 5 8.94 5 8.25 5.56 7 6.25 7zm4.5 0c.69 0 1.25.56 1.25 1.25S11.44 9.5 10.75 9.5 9.5 8.94 9.5 8.25 10.06 7 10.75 7zM15.5 8.5c-3.59 0-6.5 2.46-6.5 5.5 0 1.76.98 3.32 2.5 4.31-.11.37-.39 1.39-.45 1.61-.07.26.1.26.2.19.14-.1 2-1.36 2.33-1.57.62.18 1.28.27 1.92.27 3.59 0 6.5-2.46 6.5-5.5s-2.91-5.5-6.5-5.5zm-2 3.5c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm4 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z" />
    </svg>
  );
}

export default function DocumentActions({
  markdown,
  item,
}: {
  markdown: string;
  item: Omit<Favorite, "savedAt">;
}) {
  const [saved, setSaved] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [qr, setQr] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const sync = () => {
      try {
        setSaved(readFavorites().some((v) => v.href === item.href));
      } catch {
        setSaved(false);
      }
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("favorites-changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("favorites-changed", sync);
    };
  }, [item.href]);

  // Eagerly generate share URL and QR Code
  useEffect(() => {
    let unmounted = false;
    const value =
      typeof window !== "undefined"
        ? new URL(item.href, window.location.origin).href
        : item.href;
    setUrl(value);

    import("qrcode")
      .then((QRCode) =>
        QRCode.toDataURL(value, {
          width: 270,
          margin: 1,
          errorCorrectionLevel: "M",
        }),
      )
      .then((dataUrl) => {
        if (!unmounted) setQr(dataUrl);
      })
      .catch(() => {
        if (!unmounted) setError("二维码生成失败");
      });

    return () => {
      unmounted = true;
    };
  }, [item.href]);

  async function copy(kind: "text" | "markdown") {
    let text: string;
    try {
      if (kind === "markdown") {
        text = `# ${item.title}\n\n${markdown}`;
      } else {
        const article = document.querySelector(".product-reading-article");
        const root = article?.querySelector<HTMLElement>(".doc-markdown");
        const clone = root?.cloneNode(true) as HTMLElement | undefined;
        clone
          ?.querySelectorAll('button, [aria-hidden="true"], [data-copy-ignore]')
          .forEach((node) => node.remove());
        clone?.querySelectorAll("br").forEach((node) => node.replaceWith("\n"));
        clone
          ?.querySelectorAll(
            "p, h1, h2, h3, h4, li, pre, tr, .doc-callout, .doc-comparison, .doc-storyboard, .doc-features-grid, .doc-cards-grid",
          )
          .forEach((node) => node.append("\n"));
        clone?.querySelectorAll("th, td").forEach((node) => node.append("\t"));
        const body = clone?.textContent?.trim() || "";
        text = `${item.title}\n\n${body}`;
      }
    } catch {
      Message.error("复制失败，请手动选中文字后按 Ctrl+C");
      return;
    }

    // 站点常用 http 访问，此时浏览器不提供 navigator.clipboard，
    // 统一交给 writeClipboard 回退，避免用户看到“请允许访问剪贴板”这种无从下手的提示
    const ok = await writeClipboard(text);
    if (ok) {
      Message.success(kind === "markdown" ? "已复制 Markdown" : "已复制全文文字");
    } else {
      Message.error("复制失败，请手动选中文字后按 Ctrl+C");
    }
  }

  function downloadMarkdown() {
    try {
      const blob = new Blob([markdown], {
        type: "text/markdown;charset=utf-8",
      });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${item.title.replace(/[\\/:*?"<>|]/g, "_")}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
      Message.success("已开始下载 Markdown 文档");
    } catch {
      Message.error("下载失败，请重试");
    }
  }

  function favorite() {
    try {
      const items = readFavorites();
      const exists = items.some((v) => v.href === item.href);
      writeFavorites(
        exists
          ? items.filter((v) => v.href !== item.href)
          : [{ ...item, savedAt: new Date().toISOString() }, ...items],
      );
      setSaved(!exists);
      Message.success(exists ? "已取消收藏" : "已收藏，可在“我的收藏”查看");
    } catch {
      Message.error("浏览器无法保存收藏，请检查存储权限");
    }
  }

  async function copyShareUrl() {
    const targetUrl = url || window.location.href;
    const ok = await writeClipboard(targetUrl);
    if (ok) {
      Message.success("链接已复制");
    } else {
      Message.error("复制失败，请手动复制地址栏链接");
    }
  }

  return (
    <div className="document-actions select-none">
      {/* 1. 复制全文 Split Button（默认复制 Markdown，下拉可切换） */}
      <Dropdown.Button
        type="secondary"
        size="small"
        className="doc-arco-split-btn"
        onClick={() => copy("markdown")}
        icon={<IconDown />}
        droplist={
          <Menu
            onClickMenuItem={(key) => {
              if (key === "download-md") {
                downloadMarkdown();
              } else {
                copy(key as "text" | "markdown");
              }
            }}
          >
            <Menu.Item key="text">复制文字</Menu.Item>
            <Menu.Item key="markdown">复制 Markdown</Menu.Item>
            <Menu.Item key="download-md">下载 Markdown (.md)</Menu.Item>
          </Menu>
        }
      >
        <span className="inline-flex items-center gap-1.5 text-xs text-[#4e5969]">
          <IconCopy style={{ fontSize: 13 }} />
          <span>复制全文</span>
        </span>
      </Dropdown.Button>

      {/* 2. 外观模式切换：单图标，点击在 跟随系统 → 亮色 → 暗色 间循环 */}
      <ThemeModeSwitch />

      {/* 3. Actions Group: ☆ | ↥ | 我的收藏 */}
      <div className="doc-action-group flex items-center gap-1.5">
        {/* Star Favorite */}
        <Tooltip content={saved ? "已收藏（点击取消）" : "收藏"} position="top">
          <Button
            type="text"
            size="small"
            shape="circle"
            aria-label={saved ? "已取消收藏" : "收藏"}
            onClick={favorite}
            icon={
              saved ? (
                <IconStarFill style={{ fontSize: 16, color: "#ff7d00" }} />
              ) : (
                <IconStar style={{ fontSize: 16, color: "#4e5969" }} />
              )
            }
          />
        </Tooltip>

        <span className="doc-action-divider text-gray-300">|</span>

        {/* Share Popover */}
        <Popover
          trigger="click"
          position="bottom"
          popupVisible={shareOpen}
          onVisibleChange={setShareOpen}
          className="doc-share-popover-wrapper"
          content={
            <div className="doc-share-popover-content select-text">
              {/* WeChat Header (Centered) */}
              <div className="doc-share-header">
                <WechatIcon className="w-4 h-4 text-[#165dff] shrink-0" />
                <span>微信扫一扫</span>
              </div>

              {/* QR Code Container (Centered) */}
              <div className="doc-share-qr-wrapper">
                {qr ? (
                  <img
                    src={qr}
                    alt="微信扫码分享"
                    width={136}
                    height={136}
                    className="block rounded"
                  />
                ) : (
                  <div className="w-[136px] h-[136px] flex items-center justify-center text-xs text-gray-400">
                    {error || "正在生成…"}
                  </div>
                )}
              </div>

              {/* Centered Copy Link Button */}
              <div className="doc-share-action">
                <Button
                  type="secondary"
                  size="small"
                  icon={<IconLink style={{ fontSize: 13 }} />}
                  onClick={copyShareUrl}
                  className="doc-share-copy-btn"
                >
                  复制链接
                </Button>
              </div>
            </div>
          }
        >
          <Tooltip content="分享" position="top">
            <Button
              type="text"
              size="small"
              shape="circle"
              aria-label="分享"
              icon={
                <ShareTrayIcon
                  className={`w-4 h-4 transition-colors ${
                    shareOpen
                      ? "text-[#165dff]"
                      : "text-[#4e5969] hover:text-[#165dff]"
                  }`}
                />
              }
            />
          </Tooltip>
        </Popover>

        <span className="doc-action-divider text-gray-300">|</span>

        {/* Link to favorites */}
        <Link
          href="/favorites"
          className="text-xs text-gray-600 hover:text-[#165dff] transition-colors no-underline whitespace-nowrap ml-1"
        >
          我的收藏
        </Link>
      </div>
    </div>
  );
}
