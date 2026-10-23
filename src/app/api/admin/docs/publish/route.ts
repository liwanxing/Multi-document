import { NextResponse } from "next/server";
import { getStore, persistDocumentChange } from "@/lib/dataStore";
import { validateDocument, persistDocument, detectStaleEditor } from "@/lib/documents";
import { requirePermission } from "@/lib/auth";

export async function POST(request: Request) {
  const auth = await requirePermission("docs:publish", request);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json();
    const store = await getStore();
    const key = `${body.productId}/${body.slug}`;
    // 乐观锁基准要在 persistDocument 覆盖内存态之前取
    const existingDraft = store.drafts?.[key];
    const published = store.docs[key];
    const existing = existingDraft || published;
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
    // 发布人留痕：写进历史快照的 createdBy
    const doc = persistDocument(store, body, true, {
      actor: auth.user.username,
    });
    const result = await persistDocumentChange(store, doc, {
      publish: true,
      // DB 层乐观锁基准：写的是已发布行；首次发布（草稿转正）写的其实是草稿行
      expectedUpdatedAt: published?.updatedAt ?? existingDraft?.updatedAt,
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
