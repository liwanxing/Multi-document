import {visibleDocument,publicCatalog} from "@/lib/visibility";
import { NextResponse } from "next/server";
import { getStore } from "@/lib/dataStore";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: { productCode: string; slug: string[] } },
) {
  const store = await getStore();
  const doc = store.docs[`${params.productCode}/${params.slug.join("/")}`];
  if (!doc || !store.projects?.some(p=>visibleDocument(doc,p)))
    return NextResponse.json(
      { code: 404, message: "文档不存在或尚未发布" },
      { status: 404 },
    );
  return NextResponse.json({ code: 0, data: doc });
}
