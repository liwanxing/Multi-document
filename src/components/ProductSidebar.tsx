"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, BookOpen, History } from "lucide-react";
import type { Project, ProjectProduct, DocDetail } from "@/lib/dataStore";
import { productHref } from "@/lib/projectModel";
import GlobalSearchModal from "./GlobalSearchModal";

type NavDoc = Pick<DocDetail, "id" | "title" | "placements">;

function SparkleSearchIcon({ className = "w-4 h-4 text-gray-500" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M8.5 14A5.5 5.5 0 1 0 8.5 3a5.5 5.5 0 0 0 0 11zM12.5 12.5L16.5 16.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.8 5.2l.5 1.1 1.1.5-1.1.5-.5 1.1-.5-1.1-1.1-.5 1.1-.5.5-1.1z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function ProductSidebar({
  project,
  product,
  documents,
}: {
  project: Project;
  product: ProjectProduct;
  documents: NavDoc[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const path = usePathname();
  const base = productHref(project, product);

  // Global CMD+K shortcut to open modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const docLink = (doc: NavDoc) => (
    <Link
      onClick={() => setMenuOpen(false)}
      key={doc.id}
      className={
        path === `${base}/docs/${encodeURIComponent(doc.id)}` ? "active" : ""
      }
      href={`${base}/docs/${encodeURIComponent(doc.id)}`}
    >
      <span>{doc.title}</span>
    </Link>
  );

  function branch(parent: string | null, depth = 0): React.ReactNode {
    return product.categories
      .filter((c) => c.parentId === parent)
      .map((category) => {
        const children = (
          <div>
            {documents
              .filter((d) =>
                d.placements?.some(
                  (p) =>
                    p.projectId === project.id &&
                    p.productId === product.id &&
                    p.categoryId === category.id,
                ),
              )
              .map(docLink)}
            {branch(category.id, depth + 1)}
          </div>
        );
        return depth === 0 ? (
          <section key={category.id} className="public-tree-group public-tree-root">
            <h3 className="public-tree-heading">{category.name}</h3>
            {children}
          </section>
        ) : (
          <details key={category.id} className="public-tree-group public-tree-nested">
            <summary>
              <span>{category.name}</span>
              <ChevronDown size={13} aria-hidden="true" />
            </summary>
            {children}
          </details>
        );
      });
  }

  const unclassified = documents.filter((d) =>
    d.placements?.some(
      (p) =>
        p.projectId === project.id &&
        p.productId === product.id &&
        p.categoryId === null,
    ),
  );

  return (
    <>
      <aside className={`product-doc-sidebar ${menuOpen ? "mobile-open" : ""}`}>
        <button
          className="mobile-directory-toggle"
          aria-expanded={menuOpen}
          aria-controls="product-document-nav"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <strong>{product.name}</strong>
          <span>文档目录</span>
          <ChevronDown size={15} />
        </button>

        {/* Top Search Trigger matching Screenshots 1 & 2 */}
        <div
          role="button"
          tabIndex={0}
          aria-label="搜索文档"
          className="doc-search-trigger"
          onClick={() => setSearchModalOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setSearchModalOpen(true);
            }
          }}
        >
          <span className="doc-search-sparkle-icon">
            <SparkleSearchIcon className="w-4 h-4" />
          </span>
          <span className="doc-search-placeholder">请输入</span>
          <div className="doc-search-shortcuts">
            <kbd>⌘</kbd>
            <kbd>K</kbd>
          </div>
        </div>

        <h2>{product.name}</h2>

        <nav id="product-document-nav" aria-label="产品文档目录">
          <Link
            className={path === base ? "active nav-primary" : "nav-primary"}
            href={base}
          >
            <BookOpen size={15} aria-hidden="true" />
            产品概览
          </Link>
          <Link
            className={
              path === `${base}/updates` ? "active nav-primary" : "nav-primary"
            }
            href={`${base}/updates`}
          >
            <History size={15} aria-hidden="true" />
            产品动态<span className="update-tag">更新记录</span>
          </Link>
          <div className="tree-divider" />
          {branch(null)}
          {!!unclassified.length && (
            <section className="public-tree-group public-tree-root">
              <h3 className="public-tree-heading">未分类</h3>
              <div>{unclassified.map(docLink)}</div>
            </section>
          )}
          {!documents.length && <p className="tree-empty">文档正在准备中</p>}
        </nav>
      </aside>

      {/* Global Search Popup Modal matching Screenshots 3 & 4 */}
      <GlobalSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        project={project}
        product={product}
      />
    </>
  );
}
