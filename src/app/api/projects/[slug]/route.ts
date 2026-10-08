import { visibleDocument, publicCatalog } from "@/lib/visibility";
import { NextResponse } from "next/server";
import { getStore } from "@/lib/dataStore";
import { isBound, sortDocsByCatalog, visibleHistory } from "@/lib/projectModel";
export const dynamic = "force-dynamic";
export async function GET(
  request: Request,
  { params }: { params: { slug: string } },
) {
  const store = getStore();
  const project = store.projects?.find((p) => p.slug === params.slug);
  if (!project)
    return NextResponse.json(
      { code: 404, message: "项目不存在" },
      { status: 404 },
    );
  const productSlug = new URL(request.url).searchParams.get("product");
  const product = publicCatalog(project).products?.find(
    (p) => p.slug === productSlug,
  );
  if (productSlug && !product)
    return NextResponse.json(
      { code: 404, message: "产品不存在" },
      { status: 404 },
    );
  const documents = sortDocsByCatalog(
    Object.values(store.docs).filter((d) =>
      visibleDocument(d, project, product?.id),
    ),
    product,
  );
  const history = product
    ? visibleHistory(store.history || [], documents, project.id, product.id)
    : [];
  return NextResponse.json({
    code: 0,
    data: {
      project: publicCatalog(project),
      product: product
        ? publicCatalog(project).products?.find((p) => p.id === product.id)
        : undefined,
      documents,
      history,
    },
  });
}
