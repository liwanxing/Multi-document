import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { publicProduct } from "@/lib/publicProject";
import { productHref } from "@/lib/projectModel";
import ProductSidebar from "@/components/ProductSidebar";
export const dynamic = "force-dynamic";
export default async function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { projectSlug: string; productSlug: string };
}) {
  const { project, product, documents } = await publicProduct(
    params.projectSlug,
    params.productSlug,
  );
  return (
    <>
      <div className="product-subnav">
        <Link href={`/projects/${project.slug}`}>{project.name}</Link>
        <ChevronRight size={13} />
        <strong>{product.name}</strong>
        <span />
        <Link href={productHref(project, product)}>文档指南</Link>
        <Link href={`${productHref(project, product)}/updates`}>产品动态</Link>
      </div>
      <div className="product-document-layout">
        <ProductSidebar
          project={project}
          product={product}
          documents={documents.map(({ id, title, placements }) => ({
            id,
            title,
            placements,
          }))}
        />
        <main className="product-document-main">{children}</main>
      </div>
    </>
  );
}
