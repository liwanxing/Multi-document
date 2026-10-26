import { renderVariables } from "@/lib/variables";
import { displayDateTime } from "@/lib/dates";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, History } from "lucide-react";
import { publicProduct } from "@/lib/publicProject";
import DocumentActions from "@/components/DocumentActions";
import {
  categoryOptions,
  isBound,
  categoryPath,
  productHref,
} from "@/lib/projectModel";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { getStore } from "@/lib/dataStore";
import TableOfContents from "@/components/TableOfContents";
export const dynamic = "force-dynamic";
export default async function DocumentPage({
  params,
}: {
  params: { projectSlug: string; productSlug: string; docId: string };
}) {
  const { project, product, documents, history } = await publicProduct(
    params.projectSlug,
    params.productSlug,
  );
  const original = documents.find((d) => d.id === params.docId);
  if (!original) notFound();
  const doc = {
    ...original,
    content: renderVariables(original.content, project),
  };
  const base = productHref(project, product);
  const publishedAt =
    ((await getStore()).history || [])
      .filter((entry) => entry.docId === doc.id)
      .map((entry) => entry.publishedAt)
      .sort((a, b) => a.localeCompare(b))[0] || doc.updatedAt;
  const ordered = Array.from(
    new Map(
      [...categoryOptions(product.categories).map((c) => c.id), null]
        .flatMap((categoryId) =>
          documents.filter((d) =>
            isBound(d, project.id, product.id, categoryId),
          ),
        )
        .map((d) => [d.id, d]),
    ).values(),
  );
  const index = ordered.findIndex((d) => d.id === doc.id);
  const previous = ordered[index - 1];
  const next = ordered[index + 1];
  const placement = doc.placements?.find(
    (p) => p.projectId === project.id && p.productId === product.id,
  );
  return (
    <div className="product-reading-layout">
      <article className="product-reading-article">
        <div className="document-top-bar">
          <div className="document-breadcrumb">
            <Link href={base}>{product.name}</Link>
            <ChevronRight size={12} />
            <span>{categoryPath(product, placement?.categoryId || null)}</span>
            <ChevronRight size={12} />
            <span>{doc.title}</span>
          </div>
          <DocumentActions
            markdown={doc.content}
            item={{
              href: `${base}/docs/${encodeURIComponent(doc.id)}`,
              title: doc.title,
              project: project.name,
              product: product.name,
            }}
          />
        </div>
        <header>
          <h1>{doc.title}</h1>
          <div>
            <span>发布时间：{displayDateTime(publishedAt)}</span>
            <span>v{doc.version}</span>
            <Link href={`${base}/updates`}>
              <History size={13} />
              更新记录
            </Link>
          </div>
          {doc.description &&
            !doc.content.trimStart().startsWith(doc.description) && (
              // 摘要和正文共用同一份文档，也要走变量渲染，否则同一篇文档换个项目
              // 打开时，摘要里写死的品牌名会和正文对不上
              <p>{renderVariables(doc.description, project)}</p>
            )}
        </header>
        <MarkdownRenderer content={doc.content} appearance={doc.appearance} />
        <div className="document-updated">
          最近更新时间：
          <time dateTime={doc.updatedAt}>{displayDateTime(doc.updatedAt)}</time>
        </div>
        <nav className="document-pagination" aria-label="相邻文档">
          {previous ? (
            <Link href={`${base}/docs/${encodeURIComponent(previous.id)}`}>
              <span>‹ 上一篇</span>
              <strong>{previous.title}</strong>
            </Link>
          ) : (
            <span>已是第一篇</span>
          )}
          {next ? (
            <Link href={`${base}/docs/${encodeURIComponent(next.id)}`}>
              <strong>{next.title}</strong>
              <span>下一篇 ›</span>
            </Link>
          ) : (
            <span>已是最后一篇</span>
          )}
        </nav>
        <footer className="document-bottom">
          <Link href={base}>← 返回产品文档</Link>
          <span>
            {project.company || project.name} · {product.name}
          </span>
        </footer>
      </article>
      <TableOfContents contentKey={`${doc.id}/${doc.version}`} />
    </div>
  );
}
