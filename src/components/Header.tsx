"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layers3, ArrowUpRight } from "lucide-react";
import ThemeModeSwitch from "./ThemeModeSwitch";
export default function Header({ showAdmin = false }: { showAdmin?: boolean }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (pathname?.startsWith("/admin") || pathname?.startsWith("/projects/")) return null;
  return (
    <header
      className={`portal-header h-16 border-b sticky top-0 z-40 backdrop-blur-md transition-all duration-200 ${
        scrolled
          ? "bg-white/90 border-slate-200/80 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.05)]"
          : "bg-white/95 border-slate-100"
      }`}
    >
      <div className="max-w-[1360px] px-5 md:px-[30px] mx-auto h-full flex items-center justify-between">
        {showAdmin ? (
          <Link
            href="/"
            className="flex items-center gap-2.5 text-slate-800 font-semibold group transition-transform active:scale-[0.98]"
          >
            <span className="p-1.5 bg-[#1664FF] rounded-lg text-white shadow-sm shadow-[#1664FF33] group-hover:scale-105 transition-transform">
              <Layers3 size={19} />
            </span>
            <span>文档中心</span>
          </Link>
        ) : (
          // 访客拿到的是一条文档链接，本站没有公开的项目列表，
          // 所以品牌区不做跳转，避免点进 404。
          <span className="flex items-center gap-2.5 text-slate-800 font-semibold">
            <span className="p-1.5 bg-[#1664FF] rounded-lg text-white shadow-sm shadow-[#1664FF33]">
              <Layers3 size={19} />
            </span>
            <span>文档中心</span>
          </span>
        )}
        <div className="flex items-center gap-3">
          <ThemeModeSwitch />
          {showAdmin && (
            <Link
              href="/admin"
              className="text-xs font-medium text-slate-500 hover:text-[#1664FF] flex gap-1 items-center px-3 py-1.5 rounded-md hover:bg-slate-50 transition-colors active:scale-95"
            >
              管理后台
              <ArrowUpRight size={14} />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
