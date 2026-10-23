import { BookOpen } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 py-16 text-center">
      {/* 404 页不展示站点顶栏 */}
      <style>{`.portal-header{display:none !important;}`}</style>
      <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#1664FF] flex items-center justify-center mb-6 shadow-sm border border-blue-100/80">
        <BookOpen size={32} />
      </div>
      <span className="text-xs font-semibold uppercase tracking-widest text-[#1664FF] bg-blue-50/80 px-3 py-1 rounded-full mb-3">
        404 Not Found
      </span>
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-3 text-balance">
        页面或文档未找到
      </h1>
      <p className="text-sm text-slate-500 max-w-md mx-auto text-pretty leading-relaxed">
        您访问的文档链接可能已重命名、已下架。
      </p>
    </div>
  );
}
