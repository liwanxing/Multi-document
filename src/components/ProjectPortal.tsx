"use client";
import CategoryIcon from "./CategoryIcon";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Search,
  ArrowUpRight,
  Cpu,
  Boxes,
  Database,
  ShieldCheck,
  Network,
  BookOpen,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import type { Project, DocDetail } from "@/lib/dataStore";
import { isBound, productHref, resolveGroupIcon } from "@/lib/projectModel";
import GlobalSearchModal from "./GlobalSearchModal";

type PortalDoc = Pick<DocDetail, "id" | "title" | "description" | "placements">;
export default function ProjectPortal({
  project,
  documents,
}: {
  project: Project;
  documents: PortalDoc[];
}) {
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("");
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const products = project.products || [];
  // 分组顺序以项目配置 productGroups 为准（后台"产品分类管理"可排序），
  // 未收录进配置的分类排在最后，保持原有出现顺序。
  const groupOrder = project.productGroups || [];
  const groups = Array.from(new Set(products.map((p) => p.group))).sort(
    (a, b) => {
      const ia = groupOrder.indexOf(a);
      const ib = groupOrder.indexOf(b);
      if (ia === -1 && ib === -1) return 0;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    },
  );
  const filtered = products.filter((p) =>
    (p.name + p.description).toLowerCase().includes(search.toLowerCase()),
  );
  const matchedDocs = search
    ? documents.filter((d) =>
        (d.title + (d.description || ""))
          .toLowerCase()
          .includes(search.toLowerCase()),
      )
    : [];
  const icons = [Sparkles, Cpu, Database, Boxes, Network, ShieldCheck];

  const isClickingRef = useRef(false);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    document.body.classList.add("is-portal-page");

    let ticking = false;

    const onScroll = () => {
      if (isClickingRef.current) return;
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        ticking = false;
        if (!groups.length) return;

        const sections = groups
          .map((group, index) => {
            const el = document.getElementById(`group-${index}`);
            return el ? { group, el } : null;
          })
          .filter(Boolean) as Array<{ group: string; el: HTMLElement }>;

        if (!sections.length) return;

        // Reading line sits below the sticky header (64px). Flip the highlight
        // when the next section heading rises into the primary reading zone
        // (header bottom + 180px), so the sidebar matches the section that
        // actually dominates the viewport instead of lagging behind it.
        const header = document.querySelector(".project-public-header");
        const headerBottom = header
          ? Math.max(0, header.getBoundingClientRect().bottom)
          : 64;
        const threshold = headerBottom + 180;
        let currentGroup = sections[0].group;

        for (let i = 0; i < sections.length; i++) {
          const rect = sections[i].el.getBoundingClientRect();
          if (rect.top <= threshold) {
            currentGroup = sections[i].group;
          } else {
            break;
          }
        }

        // When scrolling to the very bottom of the page, activate the last group
        if (
          window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 60
        ) {
          currentGroup = sections[sections.length - 1].group;
        }

        setActive((prev) => (prev !== currentGroup ? currentGroup : prev));
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      document.body.classList.remove("is-portal-page");
      window.removeEventListener("scroll", onScroll);
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    };
  }, [groups]);

  // Keep active category link visible inside the sticky sidebar if it overflows
  useEffect(() => {
    if (!active) return;
    const activeLink = document.querySelector(".product-group-nav a.active") as HTMLElement | null;
    const nav = document.querySelector(".product-group-nav") as HTMLElement | null;
    if (activeLink && nav) {
      const navRect = nav.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();
      if (linkRect.top < navRect.top + 30 || linkRect.bottom > navRect.bottom - 30) {
        activeLink.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [active]);

  const handleCategoryClick = (
    e: React.MouseEvent,
    group: string,
    index: number,
  ) => {
    e.preventDefault();
    setActive(group);
    isClickingRef.current = true;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);

    const target = document.getElementById(`group-${index}`);
    if (target) {
      const headerOffset = 76;
      const elementPosition = target.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;
      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: "smooth",
      });
      history.pushState(null, "", `#group-${index}`);
    }

    clickTimerRef.current = setTimeout(() => {
      isClickingRef.current = false;
    }, 700);
  };
  return (
    <>
      <section className="catalog-hero">
        <div className="catalog-hero-inner">
          <span className="hero-kicker">{project.name} · 产品文档</span>
          <h1>欢迎来到文档中心</h1>
          <p>
            {project.description ||
              "产品指南、开发参考与最新动态，帮助你更好地使用每一项服务。"}
          </p>
          <label
            className="catalog-search cursor-pointer"
            onClick={() => setSearchModalOpen(true)}
          >
            <Search size={18} />
            <input
              readOnly
              aria-label="搜索项目中的产品和文档"
              placeholder="搜索产品或文档，例如「快速入门」"
              onClick={(e) => {
                e.stopPropagation();
                setSearchModalOpen(true);
              }}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSearchModalOpen(true);
              }}
            >
              搜索
            </button>
          </label>
          <div className="hero-summary">
            <BookOpen size={22} />
            <div>
              <strong>{products.length} 个产品 · 一站式知识入口</strong>
              <span>产品指南 / 开发文档 / 更新动态</span>
            </div>
          </div>
        </div>
      </section>
      <div className="catalog-public-layout">
        <aside className="product-group-nav">
          <span>产品分类</span>
          {groups.map((group, index) => {
            const FallbackIcon = icons[index % icons.length];
            const iconName = resolveGroupIcon(group, project.groupIcons);
            return (
              <a
                href={`#group-${index}`}
                key={group}
                className={(active || groups[0]) === group ? "active" : ""}
                onClick={(e) => handleCategoryClick(e, group, index)}
              >
                <CategoryIcon name={iconName} size={16} fallback={FallbackIcon} />
                {group}
                <ChevronRight size={12} />
              </a>
            );
          })}
        </aside>
        <main id="product-results" className="catalog-product-sections">
          {search && (
            <div className="catalog-search-results">
              <h2>
                搜索结果{" "}
                <small>
                  {filtered.length} 个产品 · {matchedDocs.length} 篇文档
                </small>
              </h2>
              {matchedDocs.map((doc) => {
                const placement = doc.placements?.find(
                  (p) => p.projectId === project.id,
                );
                const product = products.find(
                  (p) => p.id === placement?.productId,
                );
                return product ? (
                  <Link
                    key={doc.id}
                    href={`${productHref(project, product)}/docs/${encodeURIComponent(doc.id)}`}
                  >
                    <BookOpen size={16} />
                    <div>
                      <strong>{doc.title}</strong>
                      <small>
                        {product.name} · {doc.description || "查看文档"}
                      </small>
                    </div>
                    <ArrowUpRight size={14} />
                  </Link>
                ) : null;
              })}
              {!filtered.length && !matchedDocs.length && (
                <p className="portal-empty">未找到结果，请尝试其他关键词。</p>
              )}
            </div>
          )}
          {groups.map((group, index) => {
            const items = filtered.filter((p) => p.group === group);
            const FallbackIcon = icons[index % icons.length];
            const iconName = resolveGroupIcon(group, project.groupIcons);
            return items.length ? (
              <section
                key={group}
                id={`group-${index}`}
                className="catalog-product-section"
              >
                <h2>
                  <CategoryIcon name={iconName} size={19} fallback={FallbackIcon} />
                  {group}
                  <span>{items.length} 项产品</span>
                </h2>
                <div className="product-link-grid">
                  {items.map((product) => (
                    <Link href={productHref(project, product)} key={product.id}>
                      <div>
                        <strong>{product.name}</strong>
                        <ArrowUpRight size={14} />
                      </div>
                      <p>{product.description || "查阅产品指南与使用说明。"}</p>
                      <small>
                        {
                          documents.filter((d) =>
                            d.placements?.some(
                              (p) =>
                                p.projectId === project.id &&
                                p.productId === product.id,
                            ),
                          ).length
                        }{" "}
                        篇文档
                      </small>
                    </Link>
                  ))}
                </div>
              </section>
            ) : null;
          })}
          {!products.length && (
            <div className="portal-empty">此项目的产品文档正在准备中。</div>
          )}
        </main>
      </div>
      <footer className="project-public-footer flex flex-col gap-4 border-t border-slate-200/80 mt-16 pt-8 pb-12 max-w-[1360px] mx-auto px-6 text-xs text-slate-500">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-2 font-medium text-slate-700">
            <span className="w-2 h-2 rounded-full bg-[#1664FF]" />
            <span>{project.company || project.name} · 文档中心</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-400 font-normal">一站式企业知识与产品参考入口</span>
          </div>
          <div className="flex items-center gap-5 text-slate-500">
            <Link href={`/projects/${project.slug}`} className="hover:text-[#1664FF] transition-colors">
              全部产品 ({products.length})
            </Link>
            <Link href="/favorites" className="hover:text-[#1664FF] transition-colors">
              我的收藏
            </Link>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="hover:text-[#1664FF] transition-colors cursor-pointer"
            >
              返回顶部 ↑
            </button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-400 text-[11px]">
          <div>
            © 2026 {project.company || project.name}. 保留所有权利。内容以当前发布版本为准。
          </div>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-600 transition-colors">服务协议</span>
            <span>·</span>
            <span className="hover:text-slate-600 transition-colors">隐私保护</span>
            <span>·</span>
            <span className="hover:text-slate-600 transition-colors">知识产权声明</span>
          </div>
        </div>
      </footer>
      <GlobalSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        project={project}
      />
    </>
  );
}
