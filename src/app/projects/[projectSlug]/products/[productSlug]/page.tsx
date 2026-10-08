import CategoryIcon from "@/components/CategoryIcon";
import ProductMedia from "@/components/ProductMedia";
import { displayDateTime } from "@/lib/dates";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  History,
  FolderOpen,
  ChevronRight,
} from "lucide-react";
import { publicProduct } from "@/lib/publicProject";
import { productHref, isBound, categoryOptions } from "@/lib/projectModel";
export const dynamic = "force-dynamic";
export default function ProductPage({
  params,
}: {
  params: { projectSlug: string; productSlug: string };
}) {
  const { project, product, documents, history } = publicProduct(
    params.projectSlug,
    params.productSlug,
  );
  const base = productHref(project, product);
  const firstDoc =
    categoryOptions(product.categories)
      .map((c) =>
        documents.find((d) => isBound(d, project.id, product.id, c.id)),
      )
      .find(Boolean) || documents[0];
  return (
    <div className="product-overview">
      <section className="product-introduction">
        <div>
          <span className="hero-kicker">{product.group} / 产品文档</span>
          <h1>{product.name}</h1>
          <p>
            {product.description ||
              "欢迎查阅产品文档，了解产品能力、使用方法与最新更新。"}
          </p>
          <div className="product-overview-actions">
            {firstDoc && (
              <Link
                className="public-button primary"
                href={`${base}/docs/${encodeURIComponent(firstDoc.id)}`}
              >
                开始阅读
                <ArrowRight size={15} />
              </Link>
            )}
            <Link className="public-button" href={`${base}/updates`}>
              查看产品动态
              <History size={14} />
            </Link>
          </div>
        </div>
        {product.media ? (
          <ProductMedia media={product.media} name={product.name} />
        ) : (
          <img
            className="product-default-art"
            src="/images/product-knowledge.png"
            alt=""
          />
        )}
      </section>
      <div className="learning-heading">
        <h2>文档导航</h2>
        <p>由浅入深，快速了解产品功能与使用方式</p>
      </div>
      {product.categories
        .filter((c) => c.parentId === null)
        .map((category) => {
          const descendants = new Set([category.id]);
          let size = 0;
          while (size !== descendants.size) {
            size = descendants.size;
            product.categories.forEach((c) => {
              if (c.parentId && descendants.has(c.parentId))
                descendants.add(c.id);
            });
          }
          const docs = documents.filter((d) =>
            d.placements?.some(
              (p) =>
                p.projectId === project.id &&
                p.productId === product.id &&
                p.categoryId &&
                descendants.has(p.categoryId),
            ),
          );
          return (
            <section className="learning-row" key={category.id}>
              <div className="learning-label">
                <CategoryIcon name={category.icon} size={17} />
                <h2>{category.name}</h2>
              </div>
              <div className="learning-content">
                <div className="category-doc-links">
                  {docs.map((doc) => (
                    <Link
                      key={doc.id}
                      href={`${base}/docs/${encodeURIComponent(doc.id)}`}
                    >
                      <BookOpen size={15} />
                      {doc.title}
                    </Link>
                  ))}
                  {!docs.length && (
                    <p className="public-muted">此分类文档正在准备中。</p>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      {documents.some((d) => isBound(d, project.id, product.id, null)) && (
        <section className="learning-row">
          <div className="learning-label">
            <BookOpen size={17} />
            <h2>其他文档</h2>
          </div>
          <div className="learning-content category-doc-links">
            {documents
              .filter((d) => isBound(d, project.id, product.id, null))
              .map((doc) => (
                <Link
                  key={doc.id}
                  href={`${base}/docs/${encodeURIComponent(doc.id)}`}
                >
                  {doc.title}
                </Link>
              ))}
          </div>
        </section>
      )}
      {!documents.length && (
        <div className="portal-empty">产品文档正在准备中。</div>
      )}
    </div>
  );
}
