import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  getStore,
  saveStore,
  type DocCategory,
  type ProjectProduct,
} from "@/lib/dataStore";
import { isBound, sortDocsByCatalog } from "@/lib/projectModel";
import { library, findDocById, publishedIdOf, documentKey } from "@/lib/documents";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const store = await getStore();
    const project = store.projects?.find((p) => p.id === body.projectId);
    if (!project)
      return NextResponse.json(
        { code: 404, message: "项目不存在" },
        { status: 404 },
      );
    project.products ||= [];
    const products = project.products;
    const product = products.find((p) => p.id === body.productId);
    const allDocs = [
      ...Object.values(store.docs),
      ...Object.values(store.drafts || {}),
    ];
    const fail = (message: string, status = 400) =>
      NextResponse.json({ code: status, message }, { status });
    const groups = Array.from(
      new Set([
        ...(project.productGroups || []),
        ...products.map((p) => p.group),
      ]),
    );
    if (body.action === "set-group-visibility") {
      if (!groups.includes(body.name) || typeof body.hidden !== "boolean")
        return fail("分类或状态无效");
      project.hiddenProductGroups = body.hidden
        ? Array.from(
            new Set([...(project.hiddenProductGroups || []), body.name]),
          )
        : (project.hiddenProductGroups || []).filter(
            (name) => name !== body.name,
          );
      project.updatedAt = new Date().toISOString();
      await saveStore(store);
      return NextResponse.json({ code: 0, data: project });
    }
    if (body.action === "save-group" || body.action === "delete-group") {
      if (body.action === "save-group") {
        if (
          typeof body.name !== "string" ||
          !body.name.trim() ||
          body.name.trim().length > 80
        )
          return fail("分类名称需为 1–80 字");
        const name = body.name.trim();
        if (body.oldName && !groups.includes(body.oldName))
          return fail("分类不存在", 404);
        if (groups.includes(name) && name !== body.oldName)
          return fail("分类名称已存在", 409);
        project.hiddenProductGroups = project.hiddenProductGroups?.map((g) =>
          g === body.oldName ? name : g,
        );
        project.groupIcons ||= {};
        if (body.oldName && body.oldName !== name) {
          project.groupIcons[name] = project.groupIcons[body.oldName];
          delete project.groupIcons[body.oldName];
        }
        if (typeof body.icon === "string") project.groupIcons[name] = body.icon;
        project.productGroups = body.oldName
          ? groups.map((g) => (g === body.oldName ? name : g))
          : [...groups, name];
        if (body.oldName)
          products.forEach((p) => {
            if (p.group === body.oldName) p.group = name;
          });
      } else {
        if (!groups.includes(body.name)) return fail("分类不存在", 404);
        if (products.some((p) => p.group === body.name))
          return fail("分类下仍有产品，请先调整产品分类", 409);
        project.productGroups = groups.filter((g) => g !== body.name);
      }
      project.updatedAt = new Date().toISOString();
      await saveStore(store);
      return NextResponse.json({ code: 0, data: project });
    }
    if (body.action === "save-product") {
      if (
        typeof body.name !== "string" ||
        !body.name.trim() ||
        body.name.length > 80 ||
        typeof body.slug !== "string" ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.slug) ||
        body.slug.length > 80
      )
        return fail("请填写产品名称和有效的链接标识");
      if (body.productId && !product) return fail("产品不存在", 404);
      if (product && product.slug !== body.slug)
        return fail("产品链接创建后不可更改");
      if (products.some((p) => p.slug === body.slug && p.id !== body.productId))
        return fail("项目内已存在这个产品链接", 409);
      if (
        body.media &&
        (!/^\/api\/media\/[a-f0-9-]{36}\.(png|jpg|gif|webp|mp4|webm)$/.test(
          body.media.url,
        ) ||
          !["image", "video"].includes(body.media.type))
      )
        return fail("产品媒体地址无效");
      const updated: ProjectProduct = {
        media: body.media === null ? undefined : body.media || product?.media,
        id: product?.id || randomUUID(),
        slug: body.slug,
        name: body.name.trim(),
        description:
          typeof body.description === "string" ? body.description.trim() : "",
        group:
          typeof body.group === "string" && body.group.trim()
            ? body.group.trim()
            : "产品与服务",
        categories: product?.categories || [],
      };
      if (updated.group.length > 80) return fail("产品分类最多 80 字");
      project.productGroups = Array.from(new Set([...groups, updated.group]));
      project.products = product
        ? products.map((p) => (p.id === product.id ? updated : p))
        : [...products, updated];
      project.updatedAt = new Date().toISOString();
      await saveStore(store);
      return NextResponse.json({ code: 0, data: updated });
    }
    if (body.action === "set-document-visibility") {
      if (typeof body.hidden !== "boolean") return fail("状态无效");
      // 传入 id 可能指向草稿或已发布任一行；上下架语义是"这篇文档"整体生效，
      // 所以按 key 把同 key 的两行一起改，而不是只改命中的那一行
      const target = findDocById(store, String(body.docId));
      if (
        !target ||
        !isBound(target, project.id, body.productId)
      )
        return fail("文档不存在", 404);
      const key = documentKey(target);
      const rows = [store.docs[key], store.drafts?.[key]].filter(
        (d): d is (typeof allDocs)[number] => !!d,
      );
      rows.forEach((d) => {
        d.hidden = body.hidden;
        d.updatedAt = new Date().toISOString();
      });
      await saveStore(store);
      return NextResponse.json({ code: 0, data: project });
    }
    if (!product) return fail("产品不存在", 404);
    if (body.action === "set-category-visibility") {
      const category = product.categories.find((c) => c.id === body.categoryId);
      if (!category || typeof body.hidden !== "boolean")
        return fail("分类或状态无效");
      category.hidden = body.hidden;
    } else if (body.action === "delete-product") {
      if (allDocs.some((doc) => isBound(doc, project.id, product.id)))
        return fail("产品仍有文档，请先调整文档绑定并发布", 409);
      project.products = products.filter((p) => p.id !== product.id);
    } else if (body.action === "save-category") {
      if (
        typeof body.name !== "string" ||
        !body.name.trim() ||
        body.name.length > 80
      )
        return fail("请输入分类名称（最多 80 字）");
      const existing = product.categories.find((c) => c.id === body.categoryId);
      if (body.categoryId && !existing) return fail("分类不存在", 404);
      if (
        body.parentId !== null &&
        !product.categories.some((c) => c.id === body.parentId)
      )
        return fail("父分类不存在");
      let ancestor = body.parentId;
      const visited = new Set<string>();
      while (ancestor) {
        if (ancestor === body.categoryId || visited.has(ancestor))
          return fail("不能将分类移动到自身或子分类下");
        visited.add(ancestor);
        ancestor = product.categories.find((c) => c.id === ancestor)?.parentId;
      }
      const category: DocCategory = {
        icon: typeof body.icon === "string" ? body.icon : existing?.icon,
        hidden: existing?.hidden,
        id: existing?.id || randomUUID(),
        name: body.name.trim(),
        parentId: body.parentId,
      };
      product.categories = existing
        ? product.categories.map((c) => (c.id === existing.id ? category : c))
        : [...product.categories, category];
      project.updatedAt = new Date().toISOString();
      await saveStore(store);
      return NextResponse.json({ code: 0, data: category });
    } else if (body.action === "delete-category") {
      if (!product.categories.some((c) => c.id === body.categoryId))
        return fail("分类不存在", 404);
      if (product.categories.some((c) => c.parentId === body.categoryId))
        return fail("请先移除或移动子分类", 409);
      if (
        allDocs.some((doc) =>
          isBound(doc, project.id, product.id, body.categoryId),
        )
      )
        return fail("分类仍有绑定文档，请先调整绑定并发布", 409);
      product.categories = product.categories.filter(
        (c) => c.id !== body.categoryId,
      );
    } else if (body.action === "reorder-category") {
      const item = product.categories.find((c) => c.id === body.categoryId);
      if (!item || ![-1, 1].includes(body.offset)) return fail("排序参数无效");
      const peers = product.categories.filter(
        (c) => c.parentId === item.parentId,
      );
      const target =
        peers[peers.findIndex((c) => c.id === item.id) + body.offset];
      if (target) {
        const a = product.categories.indexOf(item);
        const b = product.categories.indexOf(target);
        [product.categories[a], product.categories[b]] = [
          product.categories[b],
          product.categories[a],
        ];
      }
    } else if (body.action === "reorder-document") {
      if (![-1, 1].includes(body.offset)) return fail("排序参数无效");
      const filter: string | null | undefined = body.categoryId;
      if (
        typeof filter === "string" &&
        !product.categories.some((c) => c.id === filter)
      )
        return fail("分类不存在", 404);
      // 目录排序排序的是前台可见内容：每一篇文档取一行代表（有草稿显示草稿，
      // 与 library 的覆盖合并一致），但行的 id 统一锚定到已发布行的 id——
      // docOrder 消费方（前台文档列表）按已发布 id 匹配，锚错人排序就静默失效。
      const repDocs = library(store)
        .map((d) => ({ ...d, id: publishedIdOf(store, d.id) ?? d.id }))
        .filter((d) => isBound(d, project.id, product.id, filter));
      const peers = sortDocsByCatalog(repDocs, product);
      const index = peers.findIndex((d) => d.id === body.docId);
      if (index < 0) return fail("文档不存在", 404);
      const target = peers[index + body.offset];
      if (target) {
        product.docOrder ||= library(store)
          .map((d) => ({ ...d, id: publishedIdOf(store, d.id) ?? d.id }))
          .filter((d) => isBound(d, project.id, product.id))
          .map((d) => d.id);
        const order = product.docOrder;
        order.splice(order.indexOf(body.docId), 1);
        const to = order.indexOf(target.id);
        order.splice(
          to >= 0 ? (body.offset === -1 ? to : to + 1) : order.length,
          0,
          body.docId,
        );
      }
    } else if (body.action === "reorder-product") {
      // 产品目录排序：整体上移/下移一位（前台按产品数组顺序展示）。
      // 传 targetProductId 时精确移到相邻显示项位置——列表被分类/搜索过滤时，
      // 显示相邻的两行在数组里可能不相邻。
      if (typeof body.productId !== "string" || !product)
        return fail("产品不存在", 404);
      const from = products.findIndex((p) => p.id === body.productId);
      if (from < 0) return fail("产品不存在", 404);
      let to: number;
      if (typeof body.targetProductId === "string") {
        to = products.findIndex((p) => p.id === body.targetProductId);
      } else {
        if (![-1, 1].includes(body.offset)) return fail("排序参数无效");
        to = from + body.offset;
      }
      if (to < 0 || to >= products.length) return fail("排序参数无效");
      const [moved] = products.splice(from, 1);
      products.splice(to, 0, moved);
      project.products = products;
    } else return fail("未知操作");
    project.updatedAt = new Date().toISOString();
    await saveStore(store);
    return NextResponse.json({ code: 0, data: project });
  } catch {
    return NextResponse.json(
      { code: 500, message: "目录保存失败，请重试" },
      { status: 500 },
    );
  }
}
