// MySQL 版数据层：把 DocStoreData（原 store.json 的内存形状）整体映射到数据库。
// 设计说明：
//   - 组装 getStoreFromDb()：把 11 张表的行拼回旧 Store 形状，业务代码零感知
//   - 落库 saveStoreToDb()：全量对账，但一律批量写（createMany/批量删除）
//     ——Prisma 7 无 Rust 引擎后单条语句延迟约 90ms，逐条插几百行会超时，批量写把
//       整个落库控制在秒级
//   - 时间戳一律显式读写，不用数据库自动时间戳（保持与原 JSON 行为一致，含 409 冲突检测）
import { prisma } from './prisma';
import { Prisma } from "@/generated/prisma/client";

import type {
  DocStoreData,
  DocDetail,
  DocRevision,
  DocTreeNode,
  Project,
  ProjectProduct,
  DocCategory,
} from "./dataStore";
import type { AdminUser, RoleDefinition, Permission } from "./authTypes";

// ── 工具 ────────────────────────────────────────────────────
// Json 可空列：undefined/null 统一写成数据库 NULL（Prisma 7 要求 DbNull 语义）
function j(v: unknown): Prisma.InputJsonValue {
  return (v === undefined || v === null ? Prisma.DbNull : v) as Prisma.InputJsonValue;
}
function toDate(s?: string | null, fallback?: Date): Date {
  if (s) {
    const d = new Date(s.replace(" ", "T"));
    if (!isNaN(d.getTime())) return d;
  }
  return fallback ?? new Date();
}
function fmt(d: Date | null | undefined): string {
  if (!d) return new Date().toISOString();
  return d instanceof Date ? d.toISOString() : String(d);
}
const str = (v: unknown): string | null =>
  v === null || v === undefined ? null : String(v);

// ── 组装：DB → DocStoreData ─────────────────────────────────
export async function getStoreFromDb(): Promise<DocStoreData> {
  const [roles, users, projects, treeNodes, docs, revisions, settings] =
    await Promise.all([
      prisma.role.findMany(),
      prisma.user.findMany(),
      prisma.project.findMany({
        include: { products: { include: { categories: true } } },
      }),
      prisma.docTreeNode.findMany({ orderBy: { order: "asc" } }),
      prisma.document.findMany({ include: { placements: true } }),
      prisma.docRevision.findMany(),
      prisma.appSetting.findMany(),
    ]);

  // 全局产品分类层（遗留字段）与 schemaVersion 存 app_settings
  const settingMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  const categories =
    (settingMap["globalCategories"] as unknown as DocStoreData["categories"]) ?? [];
  const schemaVersion = settingMap["schemaVersion"] as number | undefined;

  // projects + 内嵌 products + categories
  const storeProjects: Project[] = projects.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    company: str(p.company) ?? undefined,
    brandName: str(p.brandName) ?? undefined,
    customFields: (p.customFields ?? undefined) as Project["customFields"],
    productGroups: (p.productGroups ?? undefined) as string[] | undefined,
    hiddenProductGroups: (p.hiddenProductGroups ?? undefined) as string[] | undefined,
    groupIcons: (p.groupIcons ?? undefined) as Record<string, string> | undefined,
    updatedAt: fmt(p.updatedAt),
    products: p.products.map(
      (pp): ProjectProduct => ({
        id: pp.id,
        slug: pp.slug,
        name: pp.name,
        description: pp.description,
        group: pp.group,
        media: (pp.media ?? undefined) as ProjectProduct["media"],
        docOrder: (pp.docOrder ?? undefined) as string[] | undefined,
        categories: pp.categories.map(
          (c): DocCategory => ({
            id: c.id,
            name: c.name,
            icon: str(c.icon) ?? undefined,
            hidden: c.hidden || undefined,
            parentId: c.parentId,
          })
        ),
      })
    ),
  }));

  // 旧链接别名：projects.legacyAliases [{alias, productId}] → Record<alias, {projectId, productId}>
  const legacyProjectAliases: NonNullable<
    DocStoreData["legacyProjectAliases"]
  > = {};
  for (const p of projects) {
    const aliases = (p.legacyAliases ?? []) as { alias: string; productId: string }[];
    for (const a of aliases) {
      legacyProjectAliases[a.alias] = { projectId: p.id, productId: a.productId };
    }
  }

  // trees：行 → 嵌套 DocTreeNode[]
  const trees: Record<string, DocTreeNode[]> = {};
  const nodeMap = new Map<string, DocTreeNode>();
  for (const t of treeNodes) {
    (trees[t.productId] ??= []);
    nodeMap.set(t.id, {
      id: t.id,
      title: t.title,
      slug: t.slug,
      type: t.type as DocTreeNode["type"],
      status: (t.status as DocTreeNode["status"]) ?? undefined,
    });
  }
  const childMap = new Map<string | null, DocTreeNode[]>();
  for (const t of treeNodes) {
    const node = nodeMap.get(t.id)!;
    const list = childMap.get(t.parentId) ?? [];
    list.push(node);
    childMap.set(t.parentId, list);
  }
  for (const t of treeNodes) {
    const node = nodeMap.get(t.id)!;
    const children = childMap.get(t.id);
    if (children && children.length > 0) node.children = children;
    if (!t.parentId) trees[t.productId]?.push(node);
  }

  // docs / drafts：status 区分 published 与 draft，键 "productId/slug"
  const storeDocs: Record<string, DocDetail> = {};
  const storeDrafts: Record<string, DocDetail> = {};
  for (const d of docs) {
    const detail: DocDetail = {
      id: d.id,
      productId: d.productId,
      slug: d.slug,
      title: d.title,
      description: str(d.description) ?? undefined,
      breadcrumbs: (d.breadcrumbs as unknown as string[] | undefined) ?? [],
      updatedAt: fmt(d.updatedAt),
      status: d.status as DocDetail["status"],
      version: d.version,
      content: d.content,
      hidden: d.hidden || undefined,
      changeNote: str(d.changeNote) ?? undefined,
      appearance: (d.appearance ?? undefined) as DocDetail["appearance"],
      placements: d.placements.map((pl) => ({
        projectId: pl.projectId,
        productId: pl.productId,
        categoryId: pl.categoryId,
      })),
      projectIds: Array.from(
        new Set(d.placements.map((pl) => pl.projectId).filter(Boolean))
      ),
    };
    const key = `${d.productId}/${d.slug}`;
    if (d.status === "published") storeDocs[key] = detail;
    else storeDrafts[key] = detail;
  }

  const history: DocRevision[] = revisions.map((r) => ({
    id: r.id,
    docId: r.docId,
    version: r.version,
    title: r.title,
    publishedAt: fmt(r.publishedAt),
    summary: r.summary,
    changes: r.changes as string[],
    placements: (r.placements ?? undefined) as unknown as DocRevision["placements"],
    content: r.content,
    appearance: (r.appearance ?? undefined) as DocRevision["appearance"],
    baseline: r.baseline || undefined,
  }));

  const storeUsers: AdminUser[] = users.map((u) => ({
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.roleId,
    passwordHash: u.passwordHash,
    salt: u.salt,
    status: u.status as AdminUser["status"],
    createdAt: fmt(u.createdAt),
    updatedAt: fmt(u.updatedAt),
    lastLoginAt: u.lastLoginAt ? fmt(u.lastLoginAt) : undefined,
    customPermissions: (u.customPermissions ?? undefined) as AdminUser["customPermissions"],
  }));

  const storeRoles: RoleDefinition[] = roles.map((r) => ({
    id: r.id,
    name: r.name,
    description: str(r.description) ?? "",
    color: str(r.color) ?? "blue",
    permissions: r.permissions as unknown as Permission[],
    isSystem: r.isSystem || undefined,
    createdAt: fmt(r.createdAt),
    updatedAt: fmt(r.updatedAt),
  }));

  return {
    categories,
    trees,
    docs: storeDocs,
    drafts: Object.keys(storeDrafts).length > 0 ? storeDrafts : undefined,
    projects: storeProjects,
    schemaVersion,
    history,
    users: storeUsers,
    roles: storeRoles,
    legacyProjectAliases: Object.keys(legacyProjectAliases).length
      ? legacyProjectAliases
      : undefined,
  };
}

// ── 落库：DocStoreData → DB（事务内全量对账，批量写）─────────
export async function saveStoreToDb(store: DocStoreData): Promise<void> {
  const now = new Date();

  // 全量对账要跑数百条语句，默认 5s 交互事务超时不够，显式放宽
  await prisma.$transaction(
    async (tx) => {
      // ── 角色 / 用户：先查全量做比对，未变化整组跳过 ──
      const sameJsonT = (a: unknown, b: unknown) =>
        JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
      const [dbRoles, dbUsers] = await Promise.all([
        tx.role.findMany(),
        tx.user.findMany(),
      ]);
      const roleMapT = new Map(dbRoles.map((r) => [r.id, r]));
      const userMapT = new Map(dbUsers.map((u) => [u.id, u]));
      for (const r of store.roles ?? []) {
        const ex = roleMapT.get(r.id);
        if (
          ex &&
          ex.name === r.name &&
          ex.description === (r.description ?? null) &&
          ex.color === (r.color ?? null) &&
          sameJsonT(ex.permissions, r.permissions) &&
          ex.isSystem === (r.isSystem ?? false)
        )
          continue; // 未变化
        await tx.role.upsert({
          where: { id: r.id },
          create: {
            id: r.id,
            name: r.name,
            description: r.description ?? null,
            color: r.color ?? null,
            permissions: r.permissions,
            isSystem: r.isSystem ?? false,
            createdAt: toDate(r.createdAt, now),
            updatedAt: toDate(r.updatedAt, now),
          },
          update: {
            name: r.name,
            description: r.description ?? null,
            color: r.color ?? null,
            permissions: r.permissions,
            isSystem: r.isSystem ?? false,
            updatedAt: toDate(r.updatedAt, now),
          },
        });
      }
      for (const u of store.users ?? []) {
        const exU = userMapT.get(u.id);
        if (
          exU &&
          exU.username === u.username &&
          exU.name === u.name &&
          exU.roleId === u.role &&
          exU.passwordHash === u.passwordHash &&
          exU.salt === u.salt &&
          exU.status === u.status &&
          sameJsonT(exU.customPermissions, u.customPermissions)
        )
          continue; // 未变化
        await tx.user.upsert({
          where: { id: u.id },
          create: {
            id: u.id,
            username: u.username,
            name: u.name,
            roleId: u.role,
            passwordHash: u.passwordHash,
            salt: u.salt,
            status: u.status,
            lastLoginAt: u.lastLoginAt ? toDate(u.lastLoginAt) : null,
            customPermissions: j(u.customPermissions),
            createdAt: toDate(u.createdAt, now),
            updatedAt: toDate(u.updatedAt, now),
          },
          update: {
            username: u.username,
            name: u.name,
            roleId: u.role,
            passwordHash: u.passwordHash,
            salt: u.salt,
            status: u.status,
            lastLoginAt: u.lastLoginAt ? toDate(u.lastLoginAt) : null,
            customPermissions: j(u.customPermissions),
            updatedAt: toDate(u.updatedAt, now),
          },
        });
      }

      // ── 项目 / 产品 ──
      const storeProjects = store.projects ?? [];
      const keepProjectIds = storeProjects.map((p) => p.id);
      await tx.project.deleteMany({
        where: { id: { notIn: keepProjectIds.length ? keepProjectIds : [""] } },
      });
      // 项目行：先查全量做比对，未变化的跳过 upsert
      const dbProjects = await tx.project.findMany();
      const projectMapT = new Map(dbProjects.map((r) => [r.id, r]));
      // 产品/分类：一次性查全库，按 projectId 分组，避免每个项目一次查询
      const [dbProductsAll, dbCatsAll] = await Promise.all([
        tx.product.findMany(),
        tx.docCategory.findMany(),
      ]);
      const productsByProject = new Map<string, typeof dbProductsAll>();
      for (const r of dbProductsAll) {
        const list = productsByProject.get(r.projectId) ?? [];
        list.push(r);
        productsByProject.set(r.projectId, list);
      }
      const catsByProject = new Map<string, typeof dbCatsAll>();
      for (const c of dbCatsAll) {
        const list = catsByProject.get(c.productId) ?? [];
        list.push(c);
        catsByProject.set(c.productId, list);
      }
      for (const p of storeProjects) {
        const legacyAliases = Object.entries(store.legacyProjectAliases ?? {})
          .filter(([, v]) => v.projectId === p.id)
          .map(([alias, v]) => ({ alias, productId: v.productId }));
        const exP = projectMapT.get(p.id);
        if (
          !exP ||
          exP.slug !== p.slug ||
          exP.name !== p.name ||
          exP.description !== p.description ||
          exP.company !== (p.company ?? null) ||
          exP.brandName !== (p.brandName ?? null) ||
          !sameJsonT(exP.customFields, p.customFields) ||
          !sameJsonT(exP.productGroups, p.productGroups) ||
          !sameJsonT(exP.hiddenProductGroups, p.hiddenProductGroups) ||
          !sameJsonT(exP.groupIcons, p.groupIcons) ||
          !sameJsonT(exP.legacyAliases, legacyAliases.length ? legacyAliases : null)
        ) {
          await tx.project.upsert({
          where: { id: p.id },
          create: {
            id: p.id,
            slug: p.slug,
            name: p.name,
            description: p.description,
            company: p.company ?? null,
            brandName: p.brandName ?? null,
            customFields: j(p.customFields),
            productGroups: j(p.productGroups),
            hiddenProductGroups: j(p.hiddenProductGroups),
            groupIcons: j(p.groupIcons),
            legacyAliases: j(legacyAliases.length ? legacyAliases : undefined),
            updatedAt: toDate(p.updatedAt, now),
          },
          update: {
            slug: p.slug,
            name: p.name,
            description: p.description,
            company: p.company ?? null,
            brandName: p.brandName ?? null,
            customFields: j(p.customFields),
            productGroups: j(p.productGroups),
            hiddenProductGroups: j(p.hiddenProductGroups),
            groupIcons: j(p.groupIcons),
            legacyAliases: j(legacyAliases.length ? legacyAliases : undefined),
            updatedAt: toDate(p.updatedAt, now),
          },
        });
        }

        // 产品：定向对账——复用全库查询结果做内存比对，只更新有变化的行
        // （Prisma 7 无 Rust 引擎后单条语句约 90ms，48 个产品全量更新要 4s+，跳过未变行后毫秒级）
        const products = p.products ?? [];
        const keepProductIds = products.map((pp) => pp.id);
        await tx.product.deleteMany({
          where: {
            projectId: p.id,
            id: { notIn: keepProductIds.length ? keepProductIds : [""] },
          },
        });
        const existingProducts = productsByProject.get(p.id) ?? [];
        const existingMap = new Map(existingProducts.map((r) => [r.id, r]));
        const toCreate: Prisma.ProductCreateManyInput[] = [];
        const sameJson = (a: unknown, b: unknown) =>
          JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
        for (const pp of products) {
          const ex = existingMap.get(pp.id);
          if (!ex) {
            toCreate.push({
              id: pp.id,
              projectId: p.id,
              slug: pp.slug,
              name: pp.name,
              description: pp.description,
              group: pp.group,
              media: j(pp.media) as Prisma.InputJsonValue,
              docOrder: j(pp.docOrder) as Prisma.InputJsonValue,
              createdAt: now,
              updatedAt: now,
            });
            continue;
          }
          const changed =
            ex.slug !== pp.slug ||
            ex.name !== pp.name ||
            ex.description !== pp.description ||
            ex.group !== pp.group ||
            !sameJson(ex.media, pp.media) ||
            !sameJson(ex.docOrder, pp.docOrder);
          if (!changed) continue;
          await tx.product.update({
            where: { id: pp.id },
            data: {
              slug: pp.slug,
              name: pp.name,
              description: pp.description,
              group: pp.group,
              media: j(pp.media),
              docOrder: j(pp.docOrder),
              updatedAt: now,
            },
          });
        }
        if (toCreate.length > 0) await tx.product.createMany({ data: toCreate });

        // 目录分类：定向对账（id 沿用，保证稳定）
        // 新增的行需拓扑排序保证父行先插入（createMany 按数组顺序）
        const allCats = products.flatMap((pp) =>
          (pp.categories ?? []).map((c) => ({ ...c, productId: pp.id }))
        );
        // 分类可能挂在任何一个产品下：按产品分组拼出本项目的全部分类
        const existingCats = keepProductIds
          .flatMap((pid) => catsByProject.get(pid) ?? []);
        const catMap = new Map(existingCats.map((c) => [c.id, c]));
        const desiredCatIds = new Set(allCats.map((c) => c.id));
        const staleCats = existingCats.filter((c) => !desiredCatIds.has(c.id));
        if (staleCats.length > 0)
          await tx.docCategory.deleteMany({
            where: { id: { in: staleCats.map((c) => c.id) } },
          });
        for (const c of allCats) {
          const ex = catMap.get(c.id);
          if (!ex) continue;
          if (
            ex.name !== c.name ||
            ex.icon !== (c.icon ?? null) ||
            ex.hidden !== (c.hidden ?? false) ||
            ex.parentId !== (c.parentId ?? null)
          ) {
            await tx.docCategory.update({
              where: { id: c.id },
              data: {
                name: c.name,
                icon: c.icon ?? null,
                hidden: c.hidden ?? false,
                parentId: c.parentId ?? null,
              },
            });
          }
        }
        const catRows: Prisma.DocCategoryCreateManyInput[] = [];
        const emitted = new Set(existingCats.map((c) => c.id));
        const pendingCats = allCats.filter((c) => !catMap.has(c.id));
        while (pendingCats.length > 0) {
          const before = pendingCats.length;
          for (let i = pendingCats.length - 1; i >= 0; i--) {
            const c = pendingCats[i];
            if (!c.parentId || emitted.has(c.parentId)) {
              catRows.push({
                id: c.id,
                productId: c.productId,
                name: c.name,
                icon: c.icon ?? null,
                hidden: c.hidden ?? false,
                parentId: c.parentId ?? null,
              });
              emitted.add(c.id);
              pendingCats.splice(i, 1);
            }
          }
          if (pendingCats.length === before) {
            // 防御：环形/悬空父引用，剩余按原顺序插入（挂到 null，避免整批失败）
            for (const c of pendingCats) {
              catRows.push({
                id: c.id,
                productId: c.productId,
                name: c.name,
                icon: c.icon ?? null,
                hidden: c.hidden ?? false,
                parentId: null,
              });
            }
            break;
          }
        }
        if (catRows.length > 0) await tx.docCategory.createMany({ data: catRows });
      }

      // ── 阅读侧导航树：定向对账（扁平化后按 id 比对，只写变化）──
      const flatRows: Prisma.DocTreeNodeCreateManyInput[] = [];
      const flattenTree = (
        productId: string,
        nodes: DocTreeNode[] | undefined,
        parentId: string | null
      ) => {
        const list = nodes ?? [];
        for (let i = 0; i < list.length; i++) {
          const n = list[i];
          flatRows.push({
            id: n.id,
            productId,
            parentId,
            title: n.title,
            slug: n.slug,
            type: n.type,
            status: n.status ?? null,
            order: i,
          });
          flattenTree(productId, n.children, n.id);
        }
      };
      for (const [productId, nodes] of Object.entries(store.trees ?? {})) {
        flattenTree(productId, nodes, null);
      }
      const existingNodes = await tx.docTreeNode.findMany();
      const nodeMap = new Map(existingNodes.map((n) => [n.id, n]));
      const desiredNodeIds = new Set(flatRows.map((n) => n.id));
      const staleNodes = existingNodes.filter((n) => !desiredNodeIds.has(n.id));
      if (staleNodes.length > 0)
        await tx.docTreeNode.deleteMany({
          where: { id: { in: staleNodes.map((n) => n.id) } },
        });
      const treeRows: Prisma.DocTreeNodeCreateManyInput[] = [];
      for (const n of flatRows) {
        const ex = nodeMap.get(n.id);
        if (!ex) {
          treeRows.push(n);
          continue;
        }
        if (
          ex.productId !== n.productId ||
          ex.parentId !== n.parentId ||
          ex.title !== n.title ||
          ex.slug !== n.slug ||
          ex.type !== n.type ||
          ex.status !== n.status ||
          ex.order !== n.order
        ) {
          await tx.docTreeNode.update({ where: { id: n.id }, data: n });
        }
      }
      if (treeRows.length > 0) await tx.docTreeNode.createMany({ data: treeRows });

      // ── 文档（published + draft）与挂载点 ──
      const allDocs: DocDetail[] = [
        ...Object.values(store.docs ?? {}),
        ...Object.values(store.drafts ?? {}),
      ];
      const keepDocIds = allDocs.map((d) => d.id);
      await tx.document.deleteMany({
        where: { id: { notIn: keepDocIds.length ? keepDocIds : [""] } },
      });
      const existingDocs = await tx.document.findMany({
        where: { id: { in: keepDocIds } },
      });
      const docMap = new Map(existingDocs.map((r) => [r.id, r]));
      const docRows: Prisma.DocumentCreateManyInput[] = [];
      const placementRows: Prisma.DocPlacementCreateManyInput[] = [];
      const sameJson2 = (a: unknown, b: unknown) =>
        JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
      for (const d of allDocs) {
        const ex = docMap.get(d.id);
        if (ex) {
          const changed =
            ex.title !== d.title ||
            ex.description !== (d.description ?? null) ||
            ex.content !== d.content ||
            ex.status !== d.status ||
            ex.version !== d.version ||
            !sameJson2(ex.breadcrumbs, d.breadcrumbs) ||
            ex.hidden !== (d.hidden ?? false) ||
            ex.changeNote !== (d.changeNote ?? null) ||
            !sameJson2(ex.appearance, d.appearance);
          if (changed) {
            await tx.document.update({
              where: { id: d.id },
              data: {
                title: d.title,
                description: d.description ?? null,
                content: d.content,
                status: d.status,
                version: d.version,
                breadcrumbs: j(d.breadcrumbs),
                hidden: d.hidden ?? false,
                changeNote: d.changeNote ?? null,
                appearance: j(d.appearance),
                updatedAt: toDate(d.updatedAt, now),
              },
            });
          }
        } else {
          docRows.push({
            id: d.id,
            productId: d.productId,
            slug: d.slug,
            title: d.title,
            description: d.description ?? null,
            content: d.content,
            status: d.status,
            version: d.version,
            breadcrumbs: j(d.breadcrumbs) as Prisma.InputJsonValue,
            hidden: d.hidden ?? false,
            changeNote: d.changeNote ?? null,
            appearance: j(d.appearance) as Prisma.InputJsonValue,
            createdAt: toDate(d.updatedAt, now),
            updatedAt: toDate(d.updatedAt, now),
          });
        }
        for (const pl of d.placements ?? []) {
          placementRows.push({
            id: `${d.id}:${pl.projectId}:${pl.productId}:${pl.categoryId ?? ""}`,
            documentId: d.id,
            projectId: pl.projectId,
            productId: pl.productId,
            categoryId: pl.categoryId ?? null,
          });
        }
      }
      if (docRows.length > 0) await tx.document.createMany({ data: docRows });
      // 挂载点：定向对账（按合成 id 比对，只插新增、只删消失的）
      const existingPlacements = await tx.docPlacement.findMany();
      const desiredPlIds = new Set(placementRows.map((r) => r.id));
      const stalePlacements = existingPlacements.filter(
        (e) => !desiredPlIds.has(e.id)
      );
      if (stalePlacements.length > 0)
        await tx.docPlacement.deleteMany({
          where: { id: { in: stalePlacements.map((e) => e.id) } },
        });
      const existingPlIds = new Set(existingPlacements.map((e) => e.id));
      const newPlacementRows = placementRows.filter(
        (r) => !existingPlIds.has(r.id)
      );
      if (newPlacementRows.length > 0)
        await tx.docPlacement.createMany({ data: newPlacementRows });

      // ── 历史版本：按 (docId, version) 对账，版本不可变，只增不更 ──
      const keepRevKeys = (store.history ?? []).map((r) => ({
        docId: r.docId,
        version: r.version,
      }));
      const keepSet = new Set(keepRevKeys.map((k) => `${k.docId}:${k.version}`));
      const existingRevs = await tx.docRevision.findMany({
        select: { docId: true, version: true },
      });
      const stale = existingRevs.filter((e) => !keepSet.has(`${e.docId}:${e.version}`));
      for (const e of stale) {
        await tx.docRevision.deleteMany({ where: { docId: e.docId, version: e.version } });
      }
      const existingRevSet = new Set(existingRevs.map((e) => `${e.docId}:${e.version}`));
      const revRows: Prisma.DocRevisionCreateManyInput[] = [];
      for (const r of store.history ?? []) {
        if (existingRevSet.has(`${r.docId}:${r.version}`)) continue; // 版本快照不可变
        revRows.push({
          id: r.id,
          docId: r.docId,
          version: r.version,
          title: r.title,
          summary: r.summary,
          changes: r.changes as unknown as Prisma.InputJsonValue,
          placements: r.placements as unknown as Prisma.InputJsonValue,
          content: r.content,
          appearance: j(r.appearance) as Prisma.InputJsonValue,
          baseline: r.baseline ?? false,
          publishedAt: toDate(r.publishedAt, now),
        });
      }
      if (revRows.length > 0) await tx.docRevision.createMany({ data: revRows });

      // ── 遗留全局字段：值没变就跳过 ──
      const dbSettings = await tx.appSetting.findMany();
      const settingMapT = new Map(dbSettings.map((s) => [s.key, s.value]));
      if (!sameJsonT(settingMapT.get("globalCategories"), store.categories ?? [])) {
        await tx.appSetting.upsert({
          where: { key: "globalCategories" },
          create: {
            key: "globalCategories",
            value: j(store.categories ?? []),
            updatedAt: now,
          },
          update: { value: j(store.categories ?? []), updatedAt: now },
        });
      }
      if (store.schemaVersion !== undefined) {
        await tx.appSetting.upsert({
          where: { key: "schemaVersion" },
          create: {
            key: "schemaVersion",
            value: j(store.schemaVersion),
            updatedAt: now,
          },
          update: { value: j(store.schemaVersion), updatedAt: now },
        });
      }
    },
    { timeout: 60000, maxWait: 10000 }
  );
}
