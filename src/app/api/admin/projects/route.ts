import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getStore, saveStore } from "@/lib/dataStore";
import { cloneProject } from "@/lib/cloneProject";
import { library } from "@/lib/documents";
import { requirePermission } from "@/lib/auth";

export async function POST(request: Request) {
  const auth = await requirePermission("projects:edit", request);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json();
    if (
      typeof body.name !== "string" ||
      !body.name.trim() ||
      body.name.length > 80 ||
      typeof body.slug !== "string" ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.slug) ||
      body.slug.length > 80 ||
      typeof body.description !== "string"
    )
      return NextResponse.json(
        {
          code: 400,
          message: "请填写项目名称，以及小写字母、数字和连字符组成的链接标识",
        },
        { status: 400 },
      );
    const store = await getStore();
    // 自定义字段校验：key 限字母数字下划线，brand_name/company_name 为内置保留名
    let customFields: import("@/lib/dataStore").ProjectCustomField[] | undefined;
    if (body.customFields !== undefined) {
      if (!Array.isArray(body.customFields) || body.customFields.length > 50)
        return NextResponse.json(
          { code: 400, message: "自定义字段格式不正确（最多 50 个）" },
          { status: 400 },
        );
      customFields = [];
      for (const f of body.customFields) {
        if (
          !f ||
          typeof f.key !== "string" ||
          !/^\w+$/.test(f.key) ||
          ["brand_name", "company_name"].includes(f.key)
        )
          return NextResponse.json(
            { code: 400, message: `变量名不合法：${f?.key ?? ""}（限字母数字下划线，brand_name/company_name 为内置变量）` },
            { status: 400 },
          );
        customFields.push({
          key: f.key,
          label: String(f.label ?? "").slice(0, 80),
          value: String(f.value ?? "").slice(0, 500),
        });
      }
    }
    if (body.copyFrom) {
      const source = store.projects?.find((p) => p.id === body.copyFrom);
      if (!source)
        return NextResponse.json({ message: "源项目不存在" }, { status: 404 });
      if (store.projects?.some((p) => p.slug === body.slug))
        return NextResponse.json(
          { message: "链接标识已存在" },
          { status: 409 },
        );
      const copy = cloneProject(store, source, {
        name: body.name.trim(),
        description: body.description.trim(),
        slug: body.slug,
        company:typeof body.company==="string"?body.company.trim().slice(0,160):undefined,
        brandName:typeof body.brandName==="string"?body.brandName.trim().slice(0,160):undefined,
      });
      if (customFields !== undefined) copy.customFields = customFields;
      await saveStore(store);
      return NextResponse.json({ code: 0, data: copy });
    }
    const existing = store.projects?.find((p) => p.id === body.id);
    if (body.id && !existing)
      return NextResponse.json(
        { code: 404, message: "项目不存在" },
        { status: 404 },
      );
    if (existing && body.slug !== existing.slug)
      return NextResponse.json(
        { code: 400, message: "项目链接创建后不可更改" },
        { status: 400 },
      );
    if (store.projects?.some((p) => p.slug === body.slug && p.id !== body.id))
      return NextResponse.json(
        { code: 409, message: "这个项目链接已被使用，请换一个标识" },
        { status: 409 },
      );
    const project = {
      id: existing?.id || randomUUID(),
      name: body.name.trim(),
      slug: body.slug,
      description: body.description.trim(),
      groupIcons:
        body.groupIcons && typeof body.groupIcons === "object"
          ? body.groupIcons
          : existing?.groupIcons || {},
      brandName:
        typeof body.brandName === "string"
          ? body.brandName.trim().slice(0, 160)
          : existing?.brandName || "",
      company:
        typeof body.company === "string"
          ? body.company.trim().slice(0, 160)
          : existing?.company || "",
      customFields:
        customFields !== undefined
          ? customFields
          : existing?.customFields || [],
      products: existing?.products || [],
      productGroups: existing?.productGroups || [],
      hiddenProductGroups: existing?.hiddenProductGroups || [],
      updatedAt: new Date().toISOString(),
    };
    store.projects = existing
      ? store.projects!.map((p) => (p.id === existing.id ? project : p))
      : [...(store.projects || []), project];
    await saveStore(store);
    return NextResponse.json({ code: 0, data: project });
  } catch {
    return NextResponse.json(
      { code: 500, message: "项目保存失败" },
      { status: 500 },
    );
  }
}
export async function DELETE(request: Request) {
  const auth = await requirePermission("projects:delete", request);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id } = await request.json();
    const store = await getStore();
    if (!store.projects?.some((p) => p.id === id))
      return NextResponse.json(
        { code: 404, message: "项目不存在" },
        { status: 404 },
      );
    if (store.projects.find((p) => p.id === id)?.products?.length)
      return NextResponse.json(
        { code: 409, message: "请先移除项目下的产品，再删除项目" },
        { status: 409 },
      );
    if (
      [...library(store), ...Object.values(store.docs)].some((doc) =>
        doc.projectIds?.includes(id),
      )
    )
      return NextResponse.json(
        {
          code: 409,
          message: "项目仍有绑定文档，请先调整文档绑定并发布，再删除项目",
        },
        { status: 409 },
      );
    store.projects = store.projects.filter((p) => p.id !== id);
    await saveStore(store);
    return NextResponse.json({ code: 0 });
  } catch {
    return NextResponse.json(
      { code: 500, message: "项目删除失败" },
      { status: 500 },
    );
  }
}
