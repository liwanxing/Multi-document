"use client";
import { displayDateTime } from "@/lib/dates";
import {
  Table,
  Tag,
  Dropdown,
  Menu,
  Button,
  Modal,
  Input,
  Select,
  Alert,
  Empty,
  Form,
  Breadcrumb,
  Radio,
  List,
} from "@arco-design/web-react";
import IconPicker from "./IconPicker";
import CategoryIcon from "@/components/CategoryIcon";
import ProductGroups from "./ProductGroups";
import { uploadMedia } from "@/lib/uploadMedia";
import { confirmAction } from "./DesignProvider";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  FolderOpen,
  FileText,
  Link2,
  ExternalLink,
  History,
  ChevronRight,
  X,
  Search,
  FolderTree,
} from "lucide-react";
import type {
  DocCategory,
  DocDetail,
  DocPlacement,
  DocRevision,
  Project,
  ProjectProduct,
} from "@/lib/dataStore";
import {
  categoryOptions,
  categoryPath,
  isBound,
  productHref,
  visibleHistory,
  resolveGroupIcon,
  sortDocsByCatalog,
} from "@/lib/projectModel";

export type ManagerLocation = {
  productId: string;
  categoryId?: string | null;
  showUpdates: boolean;
  showGroups?: boolean;
};
type CatalogForm = {
  icon?: string;
  media?: { url: string; type: "image" | "video" } | null;
  kind: "product" | "category";
  id?: string;
  name: string;
  slug: string;
  description: string;
  group: string;
  parentId: string | null;
};
export default function ProjectManager({
  project,
  documents,
  history,
  onBack,
  onReload,
  onEdit,
  onNew,
  initialLocation,
  onLocationChange,
}: {
  initialLocation: ManagerLocation;
  onLocationChange: (location: ManagerLocation) => void;
  project: Project;
  documents: DocDetail[];
  history: DocRevision[];
  onBack: () => void;
  onReload: () => Promise<void>;
  onEdit: (doc: DocDetail) => void;
  onNew: (placement: DocPlacement, source?: DocDetail) => void;
}) {
  const [productId, setProductId] = useState(initialLocation.productId);
  const [categoryId, setCategoryId] = useState<string | null | undefined>(
    initialLocation.categoryId,
  );
  const [showUpdates, setShowUpdates] = useState(initialLocation.showUpdates);
  const [showGroups, setShowGroups] = useState(
    Boolean(initialLocation.showGroups),
  );
  useEffect(() => {
    onLocationChange({ productId, categoryId, showUpdates, showGroups });
  }, [productId, categoryId, showUpdates, showGroups, onLocationChange]);
  const [form, setForm] = useState<CatalogForm | null>(null);
  const [binding, setBinding] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [productSearch, setProductSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const product = project.products?.find((p) => p.id === productId);
  const selectedCategory =
    product && categoryId
      ? product.categories.find((c) => c.id === categoryId)
      : undefined;
  const boundDocs = sortDocsByCatalog(
    documents.filter((doc) =>
      isBound(doc, project.id, productId || undefined, categoryId),
    ),
    product,
  );
  const placement: DocPlacement = {
    projectId: project.id,
    productId,
    categoryId: categoryId || null,
  };
  const updates = product
    ? visibleHistory(
        history,
        documents.map((doc) => ({ ...doc, status: "published" })),
        project.id,
        product.id,
      )
    : [];
  const blankForm = (
    kind: "product" | "category",
    parentId: string | null = null,
  ): CatalogForm => ({
    kind,
    name: "",
    slug: "",
    description: "",
    group:
      project.productGroups?.[0] ||
      project.products?.[0]?.group ||
      "产品与服务",
    parentId,
  });
  async function request(path: string, body: unknown) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok || result.code !== 0)
      throw new Error(result.message || "操作失败");
    return result.data;
  }
  async function action(body: Record<string, unknown>, confirmText?: string) {
    if (confirmText && !(await confirmAction(confirmText, true))) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const data = await request("/api/admin/catalog", {
        projectId: project.id,
        productId,
        ...body,
      });
      await onReload();
      if (body.action === "delete-product") setProductId("");
      if (body.action === "delete-category") setCategoryId(undefined);
      return data;
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveForm(e?: any) {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    if (!form) return;
    const data = await action({
      action: form.kind === "product" ? "save-product" : "save-category",
      ...(form.kind === "product"
        ? { productId: form.id }
        : { categoryId: form.id }),
      name: form.name,
      slug: form.slug,
      description: form.description,
      group: form.group,
      parentId: form.parentId,
      media: form.media,
      icon: form.icon,
    });
    if (data) {
      setForm(null);
      if (form.kind === "product") setProductId(data.id);
    }
  }
  async function bind(doc: DocDetail, remove = false) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await request("/api/admin/bindings", {
        ...placement,
        docId: doc.id,
        action: remove ? "unbind" : "bind",
      });
      await onReload();
      setMessage(
        remove ? "已从当前分类解除绑定" : "文档已绑定，后续发布将同步更新",
      );
      if (!remove) setBinding(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function moveDocument(
    docId: string,
    target: string | null,
    from = categoryId,
  ) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await request("/api/admin/bindings", {
        action: "move",
        docId,
        projectId: project.id,
        productId,
        categoryId: target,
        fromCategoryId: from,
      });
      await onReload();
      setMessage("文档已移动到目标分类，其他项目的绑定保持不变");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function moveDocumentOrder(docId: string, offset: -1 | 1) {
    const body: Record<string, unknown> = {
      action: "reorder-document",
      docId,
      offset,
    };
    if (categoryId !== undefined) body.categoryId = categoryId;
    return action(body);
  }
  function moveProductOrder(productId: string, offset: -1 | 1) {
    // 以"当前显示列表"的相邻行为准：过滤/搜索时相邻两行在数组里可能不相邻，
    // 由 API 的 targetProductId 精确落位
    const i = displayedProducts.findIndex((p) => p.id === productId);
    const neighbor = displayedProducts[i + offset];
    const body: Record<string, unknown> = {
      action: "reorder-product",
      productId,
      offset,
    };
    if (neighbor) body.targetProductId = neighbor.id;
    return action(body);
  }
  async function selectMedia(file?: File) {
    if (!file || !form) return;
    setBusy(true);
    setError("");
    try {
      const uploaded = await uploadMedia(file);
      setForm((current) =>
        current
          ? { ...current, media: { url: uploaded.url, type: uploaded.type } }
          : current,
      );
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function openProduct(p: ProjectProduct) {
    setProductId(p.id);
    setCategoryId(undefined);
    setShowUpdates(false);
    setError("");
    setMessage("");
  }
  const groups = Array.from(
    new Set([
      ...(project.productGroups || []),
      ...(project.products?.map((p) => p.group) || []),
    ]),
  );
  const displayedProducts = (project.products || []).filter((p) => {
    const matchesGroup = selectedGroup === "all" || p.group === selectedGroup;
    const matchesSearch =
      !productSearch.trim() ||
      (p.name + (p.description || "") + p.slug + p.group)
        .toLowerCase()
        .includes(productSearch.toLowerCase());
    return matchesGroup && matchesSearch;
  });
  return (
    <section className="project-manager">
      <header className="workspace-topbar manager-topbar">
        <div className="flex items-center gap-3">
          <Button
            type="text"
            size="small"
            className="icon-button"
            title={
              showGroups
                ? "返回产品列表"
                : product
                  ? "返回产品列表"
                  : "返回项目管理"
            }
            onClick={() => {
              if (showGroups) setShowGroups(false);
              else if (product) setProductId("");
              else onBack();
            }}
          >
            <ArrowLeft size={16} />
          </Button>
          <Breadcrumb>
            <Breadcrumb.Item>
              <button
                type="button"
                className="hover:text-blue-600 transition-colors cursor-pointer bg-transparent border-0 p-0 text-inherit text-xs"
                onClick={onBack}
              >
                控制台
              </button>
            </Breadcrumb.Item>
            <Breadcrumb.Item>
              <button
                type="button"
                className="hover:text-blue-600 transition-colors cursor-pointer bg-transparent border-0 p-0 text-inherit text-xs"
                onClick={onBack}
              >
                项目管理
              </button>
            </Breadcrumb.Item>
            <Breadcrumb.Item>
              {product || showGroups ? (
                <button
                  type="button"
                  className="hover:text-blue-600 transition-colors cursor-pointer bg-transparent border-0 p-0 text-inherit text-xs"
                  onClick={() => {
                    setShowGroups(false);
                    setProductId("");
                  }}
                >
                  {project.name}
                </button>
              ) : (
                project.name
              )}
            </Breadcrumb.Item>
            <Breadcrumb.Item>
              <span className="font-semibold text-gray-900">
                {showGroups
                  ? "产品分类管理"
                  : product
                    ? product.name
                    : "产品目录"}
              </span>
            </Breadcrumb.Item>
          </Breadcrumb>
        </div>
        <div className="flex items-center gap-4">
          <Link
            className="button"
            target="_blank"
            href={
              product
                ? productHref(project, product)
                : `/projects/${project.slug}`
            }
          >
            <ExternalLink size={14} />
            访问{product ? "产品文档" : "项目首页"}
          </Link>
          <div className="console-identity">
            <span>文档工作空间</span>
            <span className="workspace-avatar">中</span>
          </div>
        </div>
      </header>
      {error && (
        <div role="alert" className="notice error">
          {error}
        </div>
      )}
      {message && (
        <div role="status" className="notice success">
          {message}
        </div>
      )}
      {showGroups ? (
        <ProductGroups
          project={project}
          onReload={onReload}
          onBack={() => setShowGroups(false)}
        />
      ) : !product ? (
        <div className="manager-page">
          <div className="page-heading flex items-center justify-between mb-4">
            <div>
              <span className="eyebrow">{project.company || project.name}</span>
              <h1 className="text-xl font-semibold text-gray-900 m-0">
                {project.name} · 产品目录
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                共 {project.products?.length || 0} 个产品 · 点击产品名称或“管理文档”进入文档目录
              </p>
            </div>
            <div className="flex items-center gap-3">
              {groups.length > 0 && (
                <Select
                  placeholder="产品分类筛选"
                  value={selectedGroup}
                  onChange={(val) => setSelectedGroup(val || "all")}
                  style={{ width: 160 }}
                  options={[
                    {
                      label: `全部分类 (${project.products?.length || 0})`,
                      value: "all",
                    },
                    ...groups.map((group) => ({
                      label: `${group} (${project.products?.filter((p) => p.group === group).length || 0})`,
                      value: group,
                    })),
                  ]}
                />
              )}
              <Input.Search
                allowClear
                placeholder="搜索产品名称..."
                value={productSearch}
                onChange={setProductSearch}
                style={{ width: 220 }}
              />
              <Button
                className="inline-flex items-center gap-1.5"
                onClick={() => setShowGroups(true)}
              >
                <FolderTree size={15} className="text-gray-500" />
                管理产品分类
              </Button>
              <Button
                type="primary"
                onClick={() => {
                  setForm(blankForm("product"));
                  setError("");
                }}
              >
                <Plus size={16} />
                新建产品
              </Button>
            </div>
          </div>

          <Table
            rowKey="id"
            data={displayedProducts}
            pagination={{ pageSize: 10, showTotal: true }}
            columns={[
              {
                title: "产品名称",
                dataIndex: "name",
                render: (_, p: ProjectProduct) => (
                  <Button type="text" onClick={() => openProduct(p)}>
                    {p.name}
                  </Button>
                ),
              },
              {
                title: "产品分类",
                dataIndex: "group",
                render: (group: string) =>
                  group ? (
                    <div className="flex items-center gap-1.5">
                      <CategoryIcon
                        name={resolveGroupIcon(group, project.groupIcons)}
                        size={14}
                      />
                      <Tag color="arcoblue">{group}</Tag>
                    </div>
                  ) : (
                    "-"
                  ),
              },
              { title: "产品介绍", dataIndex: "description", ellipsis: true },
              {
                title: "文档 / 分类",
                render: (_, p: ProjectProduct) => (
                  <Tag color="gray">
                    {documents.filter((d) => isBound(d, project.id, p.id)).length} 篇 / {p.categories.length} 分类
                  </Tag>
                ),
              },
              {
                title: "排序",
                width: 84,
                render: (_: unknown, p: ProjectProduct) => {
                  const index = displayedProducts.findIndex(
                    (item) => item.id === p.id,
                  );
                  return (
                    <div className="table-actions">
                      <Button
                        type="text"
                        className="icon-button"
                        title="上移"
                        disabled={busy || index <= 0}
                        onClick={() => moveProductOrder(p.id, -1)}
                      >
                        <ArrowUp size={13} />
                      </Button>
                      <Button
                        type="text"
                        className="icon-button"
                        title="下移"
                        disabled={
                          busy || index >= displayedProducts.length - 1
                        }
                        onClick={() => moveProductOrder(p.id, 1)}
                      >
                        <ArrowDown size={13} />
                      </Button>
                    </div>
                  );
                },
              },
              {
                title: "操作",
                width: 280,
                render: (_, p: ProjectProduct) => (
                  <div className="table-actions">
                    <Button type="text" onClick={() => openProduct(p)}>
                      管理文档
                    </Button>
                    <Button
                      type="text"
                      onClick={() => {
                        setForm({ kind: "product", ...p, parentId: null });
                        setError("");
                      }}
                    >
                      编辑
                    </Button>
                    <Button
                      type="text"
                      status="danger"
                      disabled={busy}
                      onClick={() =>
                        action(
                          { action: "delete-product", productId: p.id },
                          "删除此产品及空目录？有绑定文档的产品不可删除。",
                        )
                      }
                    >
                      删除
                    </Button>
                  </div>
                ),
              },
            ]}
          />
          {!displayedProducts.length && (
            <div className="py-8">
              <Empty
                description={
                  productSearch
                    ? `未找到与 "${productSearch}" 匹配的产品`
                    : selectedGroup === "all"
                      ? "为这个项目添加第一个产品"
                      : `产品分类 "${selectedGroup}" 下暂无产品`
                }
              />
            </div>
          )}
        </div>
      ) : (
        <div className="catalog-layout">
          <aside className="catalog-sidebar">
            <h2>{product.name}</h2>
            <button
              className={
                !showUpdates && categoryId === undefined ? "active" : ""
              }
              onClick={() => {
                setShowUpdates(false);
                setCategoryId(undefined);
              }}
            >
              <FileText size={15} />
              全部文档
              <span>
                {
                  documents.filter((d) => isBound(d, project.id, product.id))
                    .length
                }
              </span>
            </button>
            <button
              className={showUpdates ? "active" : ""}
              onClick={() => setShowUpdates(true)}
            >
              <History size={15} />
              产品动态
            </button>
            <div className="catalog-caption">
              文档分类
              <button
                title="新增一级分类"
                onClick={() => {
                  setForm(blankForm("category"));
                  setError("");
                }}
              >
                <Plus size={15} />
              </button>
            </div>
            <button
              className={!showUpdates && categoryId === null ? "active" : ""}
              onClick={() => {
                setShowUpdates(false);
                setCategoryId(null);
              }}
            >
              <FolderOpen size={14} />
              未分类
            </button>
            {categoryOptions(product.categories).map((c) => (
              <div
                className="catalog-category"
                key={c.id}
                style={{ paddingLeft: c.depth * 12 }}
              >
                <button
                  className={
                    !showUpdates && categoryId === c.id ? "active" : ""
                  }
                  onClick={() => {
                    setShowUpdates(false);
                    setCategoryId(c.id);
                  }}
                >
                  <CategoryIcon name={c.icon} size={14} />
                  <span>
                    {c.name}
                    {c.hidden ? "（已下架）" : ""}
                  </span>
                </button>
                <div className="category-actions">
                  <Dropdown
                    trigger="click"
                    droplist={
                      <Menu
                        onClickMenuItem={(key) => {
                          if (key === "document") {
                            setCategoryId(c.id);
                            onLocationChange({
                              productId,
                              categoryId: c.id,
                              showUpdates: false,
                            });
                            onNew({
                              projectId: project.id,
                              productId,
                              categoryId: c.id,
                            });
                          } else {
                            setForm(blankForm("category", c.id));
                            setError("");
                          }
                        }}
                      >
                        <Menu.Item key="document">新增文章</Menu.Item>
                        <Menu.Item key="category">新增子分类</Menu.Item>
                      </Menu>
                    }
                  >
                    <button title={`在 ${c.name} 下新增`}>
                      <Plus size={13} />
                    </button>
                  </Dropdown>
                </div>
              </div>
            ))}
            {selectedCategory && (
              <div className="catalog-category-panel">
                <div className="catalog-category-panel-name">
                  <CategoryIcon name={selectedCategory.icon} size={14} />
                  <span>
                    {selectedCategory.name}
                    {selectedCategory.hidden ? "（已下架）" : ""}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setForm({
                      ...blankForm("category"),
                      id: selectedCategory.id,
                      name: selectedCategory.name,
                      icon: selectedCategory.icon,
                      parentId: selectedCategory.parentId,
                    });
                    setError("");
                  }}
                >
                  <Pencil size={13} />
                  编辑分类
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    action({
                      action: "reorder-category",
                      categoryId: selectedCategory.id,
                      offset: -1,
                    })
                  }
                >
                  <ArrowUp size={13} />
                  上移分类
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    action({
                      action: "reorder-category",
                      categoryId: selectedCategory.id,
                      offset: 1,
                    })
                  }
                >
                  <ArrowDown size={13} />
                  下移分类
                </button>
                <button
                  className="danger"
                  disabled={busy}
                  onClick={() =>
                    action(
                      {
                        action: "delete-category",
                        categoryId: selectedCategory.id,
                      },
                      "确认删除这个空分类？",
                    )
                  }
                >
                  <Trash2 size={13} />
                  删除分类
                </button>
              </div>
            )}
          </aside>
          <main className="catalog-main">
            <div className="page-heading">
              <div>
                <span className="eyebrow">{product.name}</span>
                <h1>
                  {showUpdates
                    ? "产品动态"
                    : categoryId === undefined
                      ? "全部文档"
                      : categoryPath(product, categoryId)}
                </h1>
                <p>
                  {showUpdates
                    ? "发布后自动生成记录，草稿修改不会出现在前台。"
                    : "共享内容绑定已有文档；公司介绍、协议等差异内容在此新建。"}
                </p>
              </div>
              {!showUpdates && (
                <div className="flex gap-2">
                  <Button
                    type="secondary"
                    className=""
                    onClick={() => {
                      setBinding(true);
                      setSearch("");
                      setError("");
                    }}
                  >
                    <Link2 size={15} />
                    绑定已有文档
                  </Button>
                  <Button
                    type="primary"
                    className=""
                    onClick={() => onNew(placement)}
                  >
                    <Plus size={15} />
                    新建专属文档
                  </Button>
                </div>
              )}
            </div>
            {categoryId && !showUpdates && (
              <div className="category-management">
                <span>当前分类</span>
                <Button
                  type="secondary"
                  className=""
                  disabled={busy}
                  onClick={() =>
                    action({
                      action: "set-category-visibility",
                      categoryId,
                      hidden: !product.categories.find(
                        (c) => c.id === categoryId,
                      )?.hidden,
                    })
                  }
                >
                  {product.categories.find((c) => c.id === categoryId)?.hidden
                    ? "上架分类"
                    : "下架分类及下属文档"}
                </Button>
              </div>
            )}
            {showUpdates ? (
              <div className="admin-updates">
                {updates.map((entry) => (
                  <article key={entry.id}>
                    <span className="status-pill">v{entry.version}</span>
                    <div>
                      <strong>{entry.title}</strong>
                      <p>{entry.summary}</p>
                      <small>
                        {displayDateTime(entry.publishedAt)} ·{" "}
                        {entry.changes.join(" / ")}
                      </small>
                    </div>
                  </article>
                ))}
                {!updates.length && (
                  <div className="py-8">
                    <Empty description="发布文档后，产品动态会展示更新记录。" />
                  </div>
                )}
              </div>
            ) : (
              <Table
                rowKey="id"
                data={boundDocs}
                pagination={{ pageSize: 10, showTotal: true }}
                scroll={{ x: 990 }}
                columns={[
                  {
                    title: "文档标题",
                    dataIndex: "title",
                    width: 220,
                    render: (_, doc: DocDetail) => (
                      <Button type="text" onClick={() => onEdit(doc)}>
                        {doc.title}
                      </Button>
                    ),
                  },
                  {
                    title: "所属分类",
                    width: 160,
                    render: (_, doc: DocDetail) =>
                      doc.placements
                        ?.filter(
                          (p) =>
                            p.projectId === project.id &&
                            p.productId === product.id,
                        )
                        .map((p) => categoryPath(product, p.categoryId))
                        .join("、"),
                  },
                  {
                    title: "状态",
                    width: 100,
                    render: (_, doc: DocDetail) => (
                      <Tag
                        color={
                          doc.hidden
                            ? "gray"
                            : doc.status === "published"
                              ? "green"
                              : "orange"
                        }
                      >
                        {doc.hidden
                          ? "已下架"
                          : doc.status === "published"
                            ? "已发布"
                            : "有草稿"}
                      </Tag>
                    ),
                  },
                  {
                    title: "更新时间",
                    dataIndex: "updatedAt",
                    width: 160,
                    render: (value: string) => displayDateTime(value),
                  },
                  {
                    title: "排序",
                    width: 84,
                    render: (_: unknown, doc: DocDetail) => {
                      const index = boundDocs.findIndex(
                        (d) => d.id === doc.id,
                      );
                      return (
                        <div className="table-actions">
                          <Button
                            type="text"
                            className="icon-button"
                            title="上移"
                            disabled={busy || index <= 0}
                            onClick={() => moveDocumentOrder(doc.id, -1)}
                          >
                            <ArrowUp size={13} />
                          </Button>
                          <Button
                            type="text"
                            className="icon-button"
                            title="下移"
                            disabled={busy || index >= boundDocs.length - 1}
                            onClick={() => moveDocumentOrder(doc.id, 1)}
                          >
                            <ArrowDown size={13} />
                          </Button>
                        </div>
                      );
                    },
                  },
                  {
                    title: "操作",
                    width: 390,
                    render: (_, doc: DocDetail) => (
                      <div className="table-actions">
                        <Select
                          aria-label={`移动分类 ${doc.title}`}
                          placeholder="移动分类"
                          value={undefined}
                          style={{ width: 110 }}
                          onChange={(target) =>
                            moveDocument(doc.id, target || null)
                          }
                          options={[
                            { value: "", label: "未分类" },
                            ...categoryOptions(product.categories).map((c) => ({
                              value: c.id,
                              label: "　".repeat(c.depth) + c.name,
                            })),
                          ]}
                        />
                        <Button type="text" onClick={() => onEdit(doc)}>
                          编辑
                        </Button>
                        <Button
                          type="text"
                          onClick={() =>
                            action({
                              action: "set-document-visibility",
                              docId: doc.id,
                              hidden: !doc.hidden,
                            })
                          }
                        >
                          {doc.hidden ? "上架" : "下架"}
                        </Button>
                        <Button
                          type="text"
                          onClick={() => onNew(placement, doc)}
                        >
                          复制
                        </Button>
                        {categoryId !== undefined && (
                          <Button
                            type="text"
                            status="danger"
                            onClick={() => bind(doc, true)}
                          >
                            解绑
                          </Button>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            )}
          </main>
        </div>
      )}
      <Modal
        visible={!!form}
        title={`${form?.id ? "编辑" : "新建"}${form?.kind === "product" ? "产品" : "分类"}`}
        onCancel={() => {
          if (!busy) setForm(null);
        }}
        footer={null}
        unmountOnExit
        closable={!busy}
        className="workspace-arco-modal"
        style={{ width: 580, maxWidth: "calc(100vw - 32px)" }}
      >
        {form && (
          <Form
            layout="vertical"
            onSubmit={saveForm}
            className="mt-4"
          >
            {error && <Alert type="error" content={error} className="mb-4" />}
            <Form.Item
              label={form.kind === "product" ? "产品名称" : "分类名称"}
              required
            >
              <Input
                autoFocus
                required
                maxLength={80}
                value={form.name}
                onChange={(name) => setForm({ ...form, name })}
                placeholder={
                  form.kind === "product"
                    ? "例如：智能内容平台"
                    : "例如：快速入门"
                }
              />
            </Form.Item>

            {form.kind === "category" && (
              <Form.Item label="分类图标">
                <IconPicker
                  value={form.icon}
                  onChange={(icon) => setForm({ ...form, icon })}
                />
              </Form.Item>
            )}

            {form.kind === "product" ? (
              <>
                <Form.Item
                  label="产品链接标识"
                  required
                  extra="同一项目内不可重复，创建后保持固定。"
                >
                  <Input
                    required
                    disabled={!!form.id}
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                    value={form.slug}
                    onChange={(slug) =>
                      setForm({ ...form, slug: slug.toLowerCase() })
                    }
                    addBefore="/products/"
                    placeholder="例如 ark"
                  />
                </Form.Item>

                <Form.Item
                  label="产品分类"
                  required
                  extra="可在产品列表的“管理产品分类”中新增分类。"
                >
                  <Select
                    aria-label="产品分类"
                    value={form.group}
                    onChange={(group) => setForm({ ...form, group })}
                    getPopupContainer={() => document.body}
                    triggerProps={{ autoAlignPopupWidth: true }}
                    options={Array.from(new Set([...groups, form.group])).map(
                      (value) => ({
                        label: (
                          <div className="flex items-center gap-2">
                            <CategoryIcon
                              name={resolveGroupIcon(value, project.groupIcons)}
                              size={14}
                            />
                            <span>{value}</span>
                          </div>
                        ),
                        value,
                      }),
                    )}
                    showSearch
                    placeholder="选择产品分类"
                  />
                </Form.Item>

                <Form.Item
                  label="产品图片 / 视频"
                  extra="展示在产品文档首页右侧；不上传时保留默认插图。图片最多 10MB，视频最多 50MB。"
                >
                  <input
                    aria-label="上传产品图片或视频"
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm"
                    disabled={busy}
                    onChange={(event) => {
                      void selectMedia(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                  {form.media && (
                    <div className="mt-2">
                      <div className="product-media-preview">
                        {form.media.type === "video" ? (
                          <video src={form.media.url} controls />
                        ) : (
                          <img src={form.media.url} alt="产品媒体预览" />
                        )}
                      </div>
                      <Button
                        type="text"
                        status="danger"
                        size="small"
                        disabled={busy}
                        onClick={() => setForm({ ...form, media: null })}
                      >
                        移除媒体，使用默认插图
                      </Button>
                    </div>
                  )}
                </Form.Item>

                <Form.Item label="产品介绍">
                  <Input.TextArea
                    rows={3}
                    value={form.description}
                    onChange={(description) =>
                      setForm({ ...form, description })
                    }
                    placeholder="输入产品功能或服务介绍"
                  />
                </Form.Item>
              </>
            ) : (
              <Form.Item label="上级分类">
                <Select
                  aria-label="上级分类"
                  value={form.parentId || ""}
                  onChange={(parentId) =>
                    setForm({ ...form, parentId: parentId || null })
                  }
                  getPopupContainer={() => document.body}
                  triggerProps={{ autoAlignPopupWidth: true }}
                  options={[
                    { value: "", label: "一级分类" },
                    ...(product
                      ? categoryOptions(product.categories)
                          .filter((c) => c.id !== form.id)
                          .map((c) => ({
                            value: c.id,
                            label: "　".repeat(c.depth) + c.name,
                          }))
                      : []),
                  ]}
                />
              </Form.Item>
            )}

            <div className="modal-form-footer">
              <Button disabled={busy} onClick={() => setForm(null)}>
                取消
              </Button>
              <Button type="primary" htmlType="submit" loading={busy}>
                保存
              </Button>
            </div>
          </Form>
        )}
      </Modal>
      <Modal
        visible={binding}
        title="绑定已有文档"
        onCancel={() => {
          if (!busy) setBinding(false);
        }}
        footer={null}
        unmountOnExit
        className="workspace-arco-modal"
        style={{ width: 680, maxWidth: "calc(100vw - 32px)" }}
      >
        <Alert
          type="info"
          content={
            <span>
              目标目录：<strong>{project.name}</strong> /{" "}
              <strong>{product?.name}</strong>
              {product && placement.categoryId
                ? ` / ${categoryPath(product, placement.categoryId)}`
                : " / 未分类"}
            </span>
          }
          className="mb-4"
        />
        {error && <Alert type="error" content={error} className="mb-4" />}
        <Input.Search
          allowClear
          aria-label="搜索可绑定文档"
          value={search}
          onChange={setSearch}
          placeholder="搜索文档名称"
          className="mb-4"
        />
        <div className="max-h-[360px] overflow-y-auto pr-1 border border-gray-100 rounded-lg">
          {documents.filter((doc) => doc.title.includes(search)).length > 0 ? (
            <List
              size="small"
              bordered={false}
              dataSource={documents.filter((doc) =>
                doc.title.includes(search),
              )}
              render={(doc) => {
                const bound = isBound(
                  doc,
                  project.id,
                  productId,
                  placement.categoryId,
                );
                return (
                  <List.Item
                    key={doc.id}
                    className="hover:bg-gray-50/80 transition-colors"
                    actions={[
                      <Button
                        key="bind"
                        type={bound ? "secondary" : "outline"}
                        disabled={busy || bound}
                        size="small"
                        onClick={() => bind(doc)}
                      >
                        {bound ? "已绑定" : "绑定到此目录"}
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <div className="p-2 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                          <FileText size={16} />
                        </div>
                      }
                      title={
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-800">
                            {doc.title}
                          </span>
                          <Tag
                            size="small"
                            color={doc.status === "published" ? "green" : "orange"}
                          >
                            {doc.status === "published" ? "已发布" : "草稿"}
                          </Tag>
                        </div>
                      }
                      description={
                        <span className="text-xs text-gray-400">
                          已绑定 {doc.placements?.length || 0} 个目录
                        </span>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          ) : (
            <div className="py-8">
              <Empty description="没有匹配的文档" />
            </div>
          )}
        </div>
        <div className="modal-form-footer">
          <Button type="primary" onClick={() => setBinding(false)}>
            完成
          </Button>
        </div>
      </Modal>
    </section>
  );
}
