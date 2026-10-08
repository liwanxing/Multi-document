"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layers3, ArrowUpRight } from "lucide-react";
import ThemeModeSwitch from "./ThemeModeSwitch";
export default function Header() {
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
        <Link
          href="/"
          className="flex items-center gap-2.5 text-slate-800 font-semibold group transition-transform active:scale-[0.98]"
        >
          <span className="p-1.5 bg-[#1664FF] rounded-lg text-white shadow-sm shadow-[#1664FF33] group-hover:scale-105 transition-transform">
            <Layers3 size={19} />
          </span>
          <span>
            中广云 <span className="text-slate-300 font-light mx-1.5">/</span>
            <span className="text-sm font-normal text-slate-500">文档中心</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <ThemeModeSwitch />
          <Link
            href="/admin"
            className="text-xs font-medium text-slate-500 hover:text-[#1664FF] flex gap-1 items-center px-3 py-1.5 rounded-md hover:bg-slate-50 transition-colors active:scale-95"
          >
            管理后台
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </header>
  );
}
