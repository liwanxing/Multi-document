import Link from "next/link";
import { ArrowLeft, Home, BookOpen } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#1664FF] flex items-center justify-center mb-6 shadow-sm border border-blue-100/80">
        <BookOpen size={32} />
      </div>
      <span className="text-xs font-semibold uppercase tracking-widest text-[#1664FF] bg-blue-50/80 px-3 py-1 rounded-full mb-3">
        404 Not Found
      </span>
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-3 text-balance">
        页面或文档未找到
      </h1>
      <p className="text-sm text-slate-500 max-w-md mx-auto mb-8 text-pretty leading-relaxed">
        您访问的文档链接可能已重命名、已下架，或者所属产品发生了结构调整。请核对地址或通过下方入口返回。
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1664FF] hover:bg-[#3882ff] active:scale-95 text-white text-xs font-medium transition-all shadow-sm"
        >
          <Home size={15} />
          返回文档首页
        </Link>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-700 text-xs font-medium transition-all"
        >
          <ArrowLeft size={15} />
          管理工作空间
        </Link>
      </div>
    </div>
  );
}
