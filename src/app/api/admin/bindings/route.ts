import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  getStore,
  saveStore,
  type DocDetail,
  type DocPlacement,
} from "@/lib/dataStore";
import { documentKey, library } from "@/lib/documents";
import { placementKey } from "@/lib/projectModel";
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const store = await getStore();
    const source = library(store).find((d) => d.id === body.docId);
    const project = store.projects?.find((p) => p.id === body.projectId);
    const product = project?.products?.find((p) => p.id === body.productId);
    if (
      !source ||
      !project ||
      !product ||
      (body.categoryId !== null &&
        !product.categories.some((c) => c.id === body.categoryId))
    )
      return NextResponse.json(
        { code: 400, message: "文档或绑定位置不存在" },
        { status: 400 },
      );
    if (!["bind", "unbind", "move"].includes(body.action))
      return NextResponse.json(
        { code: 400, message: "绑定操作无效" },
        { status: 400 },
      );
    const placement: DocPlacement = {
      projectId: project.id,
      productId: product.id,
      categoryId: body.categoryId,
    };
    const key = documentKey(source);
    const versions = [store.docs[key], store.drafts?.[key]].filter(
      (doc): doc is DocDetail => !!doc,
    );
    if (body.action === "move") {
      const match = (p: DocPlacement) =>
        p.projectId === project.id &&
        p.productId === product.id &&
        (body.fromCategoryId === undefined ||
          p.categoryId === body.fromCategoryId);
      if (!versions.some((doc) => doc.placements?.some(match)))
        return NextResponse.json(
          { message: "原目录绑定已改变，请刷新后重试" },
          { status: 409 },
        );
      for (const doc of versions) {
        if (!doc.placements?.some(match)) continue;
        const next = doc.placements.filter((p) => !match(p));
        if (!next.some((p) => placementKey(p) === placementKey(placement)))
          next.push(placement);
        doc.placements = next;
        doc.projectIds = Array.from(new Set(next.map((p) => p.projectId)));
        doc.updatedAt = new Date().toISOString();
      }
      await saveStore(store);
      return NextResponse.json({
        code: 0,
        data: library(store).find((d) => d.id === source.id),
      });
    }
    const changed = versions.filter((doc) =>
      body.action === "bind"
        ? !doc.placements?.some(
            (p) => placementKey(p) === placementKey(placement),
          )
        : doc.placements?.some(
            (p) => placementKey(p) === placementKey(placement),
          ),
    );
    if (
      body.action === "unbind" &&
      changed.some((doc) => (doc.placements?.length || 0) <= 1)
    )
      return NextResponse.json(
        {
          code: 409,
          message: "文档至少保留一个绑定位置；如不再需要，请在文档中心删除文档",
        },
        { status: 409 },
      );
    for (const doc of changed) {
      doc.placements =
        body.action === "bind"
          ? [...(doc.placements || []), placement]
          : doc.placements!.filter(
              (p) => placementKey(p) !== placementKey(placement),
            );
      doc.projectIds = Array.from(
        new Set(doc.placements.map((p) => p.projectId)),
      );
      doc.updatedAt = new Date().toISOString();
    }
    const published = store.docs[key];
    if (
      body.action === "bind" &&
      published?.status === "published" &&
      changed.includes(published)
    ) {
      store.history ||= [];
      store.history.push({
        id: randomUUID(),
        docId: published.id,
        version: published.version,
        title: published.title,
        publishedAt: published.updatedAt,
        summary: `绑定已有文档至${product.name}`,
        changes: ["关联文档"],
        placements: [placement],
        content: published.content,
        appearance: published.appearance,
      });
    }
    await saveStore(store);
    return NextResponse.json({
      code: 0,
      data: library(store).find((d) => d.id === source.id),
    });
  } catch {
    return NextResponse.json(
      { code: 500, message: "绑定操作失败，请重试" },
      { status: 500 },
    );
  }
}
