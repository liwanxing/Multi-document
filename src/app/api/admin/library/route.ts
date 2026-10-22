import { NextResponse } from "next/server";
import { getStore, saveStore } from "@/lib/dataStore";
import { library, documentKey, findDocById } from "@/lib/documents";
import { requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const store = await getStore();
    return NextResponse.json({
      code: 0,
      data: {
        documents: library(store),
        projects: store.projects || [],
        history: store.history || [],
      },
    });
  } catch {
    return NextResponse.json(
      { code: 500, message: "文档数据读取失败" },
      { status: 500 },
    );
  }
}
export async function DELETE(request: Request) {
  const auth = await requirePermission("docs:delete", request);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id } = await request.json();
    const store = await getStore();
    // 全行寻址：传入 id 可能指向草稿或已发布任一行
    const doc = findDocById(store, id);
    if (!doc)
      return NextResponse.json(
        { code: 404, message: "文档不存在" },
        { status: 404 },
      );
    // 草稿与已发布是两行、两个 id，但历史只挂已发布行的 id。
    // 传入的 id 可能是草稿 id，所以要把同 key 两行的 id 都收进来再过滤历史，
    // 否则删草稿 id 时历史残留在库里，落库时外键指向已删除的文档行直接失败。
    const key = documentKey(doc);
    const relatedIds = new Set([doc.id]);
    if (store.docs[key]) relatedIds.add(store.docs[key]!.id);
    if (store.drafts?.[key]) relatedIds.add(store.drafts[key]!.id);
    delete store.docs[key];
    if (store.drafts) delete store.drafts[key];
    store.history = store.history?.filter(
      (entry) => !relatedIds.has(entry.docId),
    );
    await saveStore(store);
    return NextResponse.json({ code: 0, message: "删除成功" });
  } catch {
    return NextResponse.json(
      { code: 500, message: "删除失败，请重试" },
      { status: 500 },
    );
  }
}
export async function PATCH(request: Request) {
  const auth = await requirePermission("docs:edit", request);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id, hidden } = await request.json();
    const store = await getStore();
    const doc = findDocById(store, id);
    if (!doc)
      return NextResponse.json(
        { code: 404, message: "文档不存在" },
        { status: 404 },
      );
    const key = documentKey(doc);
    if (store.docs[key]) {
      store.docs[key].hidden = !!hidden;
    }
    if (store.drafts?.[key]) {
      store.drafts[key].hidden = !!hidden;
    }
    await saveStore(store);
    return NextResponse.json({
      code: 0,
      data: { ...doc, hidden: !!hidden },
    });
  } catch {
    return NextResponse.json(
      { code: 500, message: "状态更新失败，请重试" },
      { status: 500 },
    );
  }
}

