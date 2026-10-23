import { NextResponse } from "next/server";
import { getStore, persistDocumentChange } from "@/lib/dataStore";
import { validateDocument, persistDocument, detectStaleEditor } from "@/lib/documents";
import { requirePermission } from "@/lib/auth";

export async function POST(request: Request) {
  const auth = await requirePermission("docs:edit", request);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json();
    const store = await getStore();
    const key = `${body.productId}/${body.slug}`;
    // 乐观锁基准要在 persistDocument 覆盖内存态之前取
    const existingDraft = store.drafts?.[key];
    const existing = existingDraft || store.docs[key];
    if (existing && body.updatedAt !== existing.updatedAt)
      return NextResponse.json(
        {
          code: 409,
          message:
            "文档已在其他窗口更新，请先导出当前正文，再重新打开文档合并修改",
        },
        { status: 409 },
      );
    const stale = detectStaleEditor(body, store);
    if (stale)
      return NextResponse.json({ code: 409, message: stale }, { status: 409 });
    const error = validateDocument(body, store);
    if (error)
      return NextResponse.json({ code: 400, message: error }, { status: 400 });
    const doc = persistDocument(store, body, false);
    const result = await persistDocumentChange(store, doc, {
      publish: false,
      // DB 层乐观锁基准：写的是草稿行，取草稿行读到的 updatedAt；
      // 尚无草稿行则走插入路径，无需基准
      expectedUpdatedAt: existingDraft?.updatedAt,
    });
    if (!result.ok)
      return NextResponse.json(
        {
          code: 409,
          message:
            "文档已在其他窗口更新，请先导出当前正文，再重新打开文档合并修改",
        },
        { status: 409 },
      );
    return NextResponse.json({ code: 0, data: doc });
  } catch {
    return NextResponse.json(
      { code: 500, message: "保存失败，请重试" },
      { status: 500 },
    );
  }
}
