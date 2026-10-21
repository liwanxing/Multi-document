import { NextResponse } from "next/server";
import { getStore, saveStore } from "@/lib/dataStore";
import { library, documentKey } from "@/lib/documents";
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
    const doc = library(store).find((doc) => doc.id === id);
    if (!doc)
      return NextResponse.json(
        { code: 404, message: "文档不存在" },
        { status: 404 },
      );
    delete store.docs[documentKey(doc)];
    if (store.drafts) delete store.drafts[documentKey(doc)];
    store.history = store.history?.filter((entry) => entry.docId !== id);
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
    const doc = library(store).find((doc) => doc.id === id);
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

