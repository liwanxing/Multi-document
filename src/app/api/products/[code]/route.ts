import { visibleDocument, publicCatalog } from "@/lib/visibility";
import type { DocTreeNode } from "@/lib/dataStore";
import { NextResponse } from "next/server";
import { getStore } from "@/lib/dataStore";

export async function GET(
  request: Request,
  { params }: { params: { code: string } },
) {
  const store = await getStore();
  const { code } = params;

  // Find product from all categories
  let targetProduct = null;
  for (const cat of store.categories) {
    const p = cat.products.find((item) => item.code === code);
    if (p) {
      targetProduct = p;
      break;
    }
  }

  if (!targetProduct) {
    return NextResponse.json(
      { code: 404, message: "Product not found" },
      { status: 404 },
    );
  }

  const project = store.projects?.find((p) =>
    p.products?.some((product) => product.id === code || product.slug === code),
  );
  const product =
    project &&
    publicCatalog(project).products?.find(
      (p) => p.id === code || p.slug === code,
    );
  if (!project || !product)
    return NextResponse.json(
      { code: 404, message: "产品不存在" },
      { status: 404 },
    );
  const docs =
    project && product
      ? Object.values(store.docs).filter((d) =>
          visibleDocument(d, project, product.id),
        )
      : [];
  const nodes = (parentId: string | null): DocTreeNode[] =>
    product
      ? [
          ...product.categories
            .filter((c) => c.parentId === parentId)
            .map((c) => ({
              id: c.id,
              title: c.name,
              slug: c.id,
              type: "folder" as const,
              children: nodes(c.id),
            })),
          ...docs
            .filter((d) =>
              d.placements?.some(
                (p) =>
                  p.projectId === project!.id &&
                  p.productId === product.id &&
                  p.categoryId === parentId,
              ),
            )
            .map((d) => ({
              id: d.id,
              title: d.title,
              slug: d.slug,
              type: "doc" as const,
            })),
        ]
      : [];
  const tree = nodes(null);

  return NextResponse.json({
    code: 0,
    data: {
      product: targetProduct,
      tree,
    },
  });
}
