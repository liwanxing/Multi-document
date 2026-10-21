import { NextResponse } from "next/server";
import { getStore, saveStore, DocTreeNode } from "@/lib/dataStore";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, tree } = body;

    if (!productId || !Array.isArray(tree)) {
      return NextResponse.json(
        {
          code: 400,
          message: "Invalid payload: productId and tree array required",
        },
        { status: 400 },
      );
    }

    const store = await getStore();
    store.trees[productId] = tree;
    await saveStore(store);

    return NextResponse.json({
      code: 0,
      message: "文档目录树已实时更新并保存",
      data: tree,
    });
  } catch (error: any) {
    return NextResponse.json(
      { code: 500, message: error.message || "Tree update failed" },
      { status: 500 },
    );
  }
}
