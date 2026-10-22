import {visibleDocument} from "@/lib/visibility";
import Link from "next/link";
import { FolderOpen, ArrowUpRight } from "lucide-react";
import { getStore } from "@/lib/dataStore";
import { getAuthenticatedUser } from "@/lib/auth";
export const dynamic = "force-dynamic";
export default async function HomePage() {
  const [store, adminUser] = await Promise.all([
    getStore(),
    // 仅已登录的后管用户可见"管理后台"入口（未登录访客不可见）
    getAuthenticatedUser(),
  ]);
  return (
    <div className="project-portal max-w-[1360px] mx-auto px-6 py-10 w-full">
      <section className="portal-hero mb-10">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-[#1664FF] border border-blue-100/80 mb-3 tracking-wide">
          多项目文档平台
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight text-balance">
          选择项目，进入完整的文档中心
        </h1>
        <p className="text-sm text-slate-500 mt-2 text-pretty">
          每个项目拥有独立的产品目录、多级分类文档与更新记录，支持一站式跨端查阅与维护。
        </p>
      </section>
      <div className="portal-section-title">
        <h2>所有项目</h2>
        {adminUser && (
          <Link href="/admin" className="hover:text-[#1664FF] transition-colors flex items-center gap-1">
            管理工作空间 →
          </Link>
        )}
      </div>
      <div className="portal-doc-grid">
        {store.projects?.map((project) => (
          <Link
            className="portal-doc-card group"
            key={project.id}
            href={`/projects/${project.slug}`}
          >
            <FolderOpen size={26} className="text-[#1664FF]" />
            <h3>{project.name}</h3>
            <p>{project.description || "访问项目文档中心"}</p>
            <small className="flex justify-between items-center tabular-nums">
              <span>
                {project.products?.length || 0} 个产品 ·{" "}
                {
                  Object.values(store.docs).filter(
                    (doc) =>
                      visibleDocument(doc,project),
                  ).length
                }{" "}
                篇文档
              </span>
              <ArrowUpRight size={15} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </small>
          </Link>
        ))}
      </div>
      {!store.projects?.length && (
        <div className="portal-empty flex flex-col items-center justify-center">
          <p className="text-base font-medium text-slate-700 mb-1">暂无可用项目</p>
          <p className="text-sm text-slate-500 mb-4">
            {adminUser
              ? "请前往管理后台创建首个文档项目或导入产品与分类。"
              : "项目文档正在准备中，敬请期待。"}
          </p>
          {adminUser && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1664FF] hover:bg-[#3882ff] active:scale-95 text-white text-xs font-medium rounded-lg transition-all shadow-sm"
            >
              进入后台创建
              <ArrowUpRight size={14} />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
