import { publicCatalog } from "@/lib/visibility";
import { NextResponse } from "next/server";
import { getStore } from "@/lib/dataStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = getStore();
  return NextResponse.json({
    code: 0,
    data: store.categories
      .map((c) => ({
        ...c,
        products: c.products.filter((p) =>
          store.projects?.some((project) =>
            publicCatalog(project).products?.some(
              (product) => product.id === p.code || product.slug === p.code,
            ),
          ),
        ),
      }))
      .filter((c) => c.products.length),
  });
}
