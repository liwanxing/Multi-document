import { NextResponse } from "next/server";
import { getStore, saveStore } from "@/lib/dataStore";
import { validateDocument, persistDocument } from "@/lib/documents";
import { requirePermission } from "@/lib/auth";

export async function POST(request: Request) {
  const auth = await requirePermission("docs:edit", request);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json();
    const store = getStore();
    const key = `${body.productId}/${body.slug}`;
    const existing = store.drafts?.[key] || store.docs[key];
    if (existing && body.updatedAt !== existing.updatedAt)
      return NextResponse.json(
        {
          code: 409,
          message:
            "文档已在其他窗口更新，请先导出当前正文，再重新打开文档合并修改",
        },
        { status: 409 },
      );
    const error = validateDocument(body, store);
    if (error)
      return NextResponse.json({ code: 400, message: error }, { status: 400 });
    const doc = persistDocument(store, body, false);
    saveStore(store);
    return NextResponse.json({ code: 0, data: doc });
  } catch {
    return NextResponse.json(
      { code: 500, message: "保存失败，请重试" },
      { status: 500 },
    );
  }
}
