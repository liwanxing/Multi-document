"use client";
import {
  Button,
  Input,
  Select,
  Modal,
  Tag,
  Table,
  Empty,
  Spin,
  Breadcrumb,
  Menu,
  Alert,
  Form,
  List,
  Message,
} from "@arco-design/web-react";
import {
  IconEdit,
  IconDelete,
  IconEye,
  IconEyeInvisible,
} from "@arco-design/web-react/icon";
import { displayDateTime } from "@/lib/dates";
import { confirmAction } from "@/components/admin/DesignProvider";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  LayoutGrid,
  BookOpen,
  Plus,
  Search,
  ArrowUpRight,
  FolderOpen,
  FileText,
  Pencil,
  Trash2,
  Copy,
  Check,
  ArrowLeft,
  Layers3,
  X,
  LogOut,
  Users,
  Shield,
} from "lucide-react";
import type {
  Project,
  DocDetail,
  DocPlacement,
  DocRevision,
} from "@/lib/dataStore";
import { defaultAppearance } from "@/lib/editor";
import dynamic from "next/dynamic";
import PlacementPicker from "@/components/admin/PlacementPicker";
import ProjectManager, {
  type ManagerLocation,
} from "@/components/admin/ProjectManager";
import UserManager from "@/components/admin/UserManager";
import { SafeAdminUser, hasUserPermission, ROLE_LABELS } from "@/lib/authTypes";
import { placementKey, placementLabel } from "@/lib/projectModel";
const DocumentEditor = dynamic(
  () => import("@/components/admin/DocumentEditor"),
  { loading: () => <div className="empty-state">正在打开编辑器…</div> },
);

type ProjectForm = {
  copyFrom?: string;
  brandName?: string;
  company?: string;
  customFields?: { key: string; label: string; value: string }[];
  id?: string;
  name: string;
  slug: string;
  description: string;
};

// 自定义字段是否未填写完整：变量名/值为必填，且变量名不可重复
function customFieldsIncomplete(
  fields: { key: string; label: string; value: string }[] | undefined,
): boolean {
  const list = fields || [];
  return list.some((f, i) => {
    const k = f.key.trim();
    return (
      !k ||
      !f.value.trim() ||
      list.findIndex((x) => x.key.trim() === k) !== i
    );
  });
}
export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<SafeAdminUser | null>(null);
  const [view, setView] = useState<"projects" | "documents" | "users">("projects");
  const [projects, setProjects] = useState<Project[]>([]);
  const [documents, setDocuments] = useState<DocDetail[]>([]);
  const [editing, setEditing] = useState<DocDetail | null>(null);
  // 打开编辑器时的项目上下文：预览里的 brand_name 等变量按这个项目的配置渲染
  const [editingProjectId, setEditingProjectId] = useState("");
  const [projectForm, setProjectForm] = useState<ProjectForm | null>(null);
  const [managing, setManaging] = useState<string | null>(null);
  // 首次渲染时同步捕获上次的工作现场快照。必须在任何 setState 生效前完成——
  // 否则下方"自动保存现场"的 effect 会用挂载时的默认值把它覆盖掉，
  // 导致刷新后永远恢复不到原来的页面（"刷新跳转到其他页面" bug 的根因）。
  const savedUiStateRef = useRef<{
    view?: string;
    managing?: string | null;
    managerLocation?: ManagerLocation;
    editingId?: string | null;
  } | null>(null);
  if (savedUiStateRef.current === null) {
    try {
      savedUiStateRef.current =
        JSON.parse(sessionStorage.getItem("admin-ui-state") || "null") ?? {};
    } catch {
      savedUiStateRef.current = {};
    }
  }
  // 首次加载完成前不写 sessionStorage（同上，防止默认值覆盖上次现场）
  const uiStateLoadedRef = useRef(false);
  const [managerLocation, setManagerLocation] = useState<ManagerLocation>({
    productId: "",
    showUpdates: false,
  });
  const [history, setHistory] = useState<DocRevision[]>([]);
  const [newDoc, setNewDoc] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [bindings, setBindings] = useState<DocPlacement[]>([]);
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [docPage, setDocPage] = useState(1);
  const [docPageSize, setDocPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  async function load(initial = false) {
    try {
      const meRes = await fetch("/api/admin/auth/me", { cache: "no-store" });
      const meResult = await meRes.json();
      if (!meRes.ok || meResult.code !== 0) {
        window.location.href = "/admin/login";
        return;
      }
      setCurrentUser(meResult.data);

      const response = await fetch("/api/admin/library", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || result.code !== 0)
        throw new Error(result.message || "读取失败");
      setProjects(result.data.projects);
      setDocuments(result.data.documents);
      setHistory(result.data.history || []);
      if (initial) {
        const query = new URLSearchParams(window.location.search);
        if (query.get("view") === "documents" || query.has("doc"))
          setView("documents");
        else if (query.get("view") === "users")
          setView("users");
        const target = result.data.documents.find(
          (doc: DocDetail) =>
            doc.slug === query.get("doc") &&
            doc.productId === query.get("product"),
        );
        if (target) setEditing(target);
        // URL 没有明确指示时，恢复上次的工作现场（首次渲染时捕获的快照）
        if (!query.has("view") && !query.has("doc")) {
          try {
            const saved = savedUiStateRef.current;
            if (saved && typeof saved === "object") {
              if (
                saved.view === "projects" ||
                saved.view === "documents" ||
                saved.view === "users"
              )
                setView(saved.view);
              if (
                typeof saved.managing === "string" &&
                result.data.projects.some((p: Project) => p.id === saved.managing)
              )
                setManaging(saved.managing);
              if (
                saved.managerLocation &&
                typeof saved.managerLocation.productId === "string"
              )
                setManagerLocation(saved.managerLocation);
              // 恢复正在编辑的文档（未保存的新文档不在列表里，自然跳过）
              if (!target && typeof saved.editingId === "string") {
                const editingTarget = result.data.documents.find(
                  (d: DocDetail) => d.id === saved.editingId,
                );
                if (editingTarget) setEditing(editingTarget);
              }
            }
          } catch {}
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败，请重试");
    } finally {
      if (initial) uiStateLoadedRef.current = true;
      setLoading(false);
    }
  }
  async function handleLogout() {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
      Message.success("已安全退出");
      window.location.href = "/admin/login";
    } catch {
      window.location.href = "/admin/login";
    }
  }
  useEffect(() => {
    void load(true);
  }, []);
  // 记住后台工作现场（所在页面/正在管理的项目/产品位置/正在编辑的文档）：
  // 刷新（F5）后原地恢复，不再被踢回"项目管理"首屏。
  // 注意：必须在首次加载完成后才开始写，否则挂载时的默认值会覆盖掉上次现场。
  useEffect(() => {
    if (!uiStateLoadedRef.current) return;
    try {
      sessionStorage.setItem(
        "admin-ui-state",
        JSON.stringify({
          view,
          managing,
          managerLocation,
          editingId: editing?.id ?? null,
        }),
      );
    } catch {}
  }, [view, managing, managerLocation, editing]);
  async function mutate(url: string, method: string, body: unknown) {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok || result.code !== 0)
      throw new Error(result.message || "操作失败");
    return result;
  }
  async function saveProject(e?: any) {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    if (!projectForm || busy) return;
    // 自定义字段校验：整行全空自动丢弃；其余行变量名和值均必填，且变量名不可重复
    let payload = projectForm;
    if (projectForm.customFields?.length) {
      const cleaned = projectForm.customFields.filter(
        (f) => f.key.trim() || f.label.trim() || f.value.trim(),
      );
      if (customFieldsIncomplete(cleaned)) {
        Message.error("自定义字段的变量名和值均为必填，且变量名不能重复");
        return;
      }
      payload = { ...projectForm, customFields: cleaned };
    }
    setBusy(true);
    setError("");
    try {
      await mutate("/api/admin/projects", "POST", payload);
      setProjectForm(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function deleteItem(type: "project" | "doc", id: string) {
    if (type === "project" && !hasUserPermission(currentUser, "projects:delete")) {
      Message.warning("只有超级管理员有权删除项目");
      return;
    }
    if (type === "doc" && !hasUserPermission(currentUser, "docs:delete")) {
      Message.warning("无权删除文档");
      return;
    }
    if (
      !(await confirmAction(
        type === "project"
          ? "删除此项目？请先移除项目中的产品与文档绑定。"
          : "删除文档及其草稿和历史记录？所有绑定项目将无法再访问此文档。",
        true,
      ))
    )
      return;
    setBusy(true);
    setError("");
    try {
      await mutate(
        type === "project" ? "/api/admin/projects" : "/api/admin/library",
        "DELETE",
        { id },
      );
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function toggleVisibility(doc: DocDetail) {
    const nextHidden = !doc.hidden;
    const actionText = nextHidden ? "下架" : "上架";
    if (
      !(await confirmAction(
        nextHidden
          ? `确认下架文档《${doc.title}》？下架后前台门户将不可见该文档。`
          : `确认重新上架文档《${doc.title}》？上架后前台门户将恢复可见。`,
      ))
    )
      return;
    setBusy(true);
    setError("");
    try {
      await mutate("/api/admin/library", "PATCH", {
        id: doc.id,
        hidden: nextHidden,
      });
      Message.success(`文档已${actionText}`);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function createDocument(e?: any) {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    if (!bindings.length) {
      setError("请至少添加一个项目 / 产品 / 分类绑定位置");
      return;
    }
    const id = crypto.randomUUID();
    setEditingProjectId(bindings[0]?.projectId || "");
    setEditing({
      id,
      productId: "library",
      slug: id,
      title: docTitle.trim(),
      description: "",
      content: "",
      breadcrumbs: ["文档中心", docTitle.trim()],
      status: "draft",
      version: 1,
      updatedAt: "",
      placements: bindings,
      projectIds: Array.from(new Set(bindings.map((p) => p.projectId))),
      appearance: defaultAppearance,
    });
    setNewDoc(false);
    setView("documents");
    setError("");
  }
  async function copyLink(project: Project) {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/projects/${project.slug}`,
      );
      setCopied(project.id);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      setError("复制失败，请通过“访问项目”打开链接后复制地址");
    }
  }
  const matchedProjects = projects.filter((p) =>
    (p.name + p.slug + p.description)
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const matchedDocs = documents.filter((doc) => {
    const matchesSearch =
      (doc.title + (doc.description || ""))
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchesProject =
      projectFilter === "all" || doc.projectIds?.includes(projectFilter);
    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "published"
          ? doc.status === "published" && !doc.hidden
          : statusFilter === "hidden"
            ? !!doc.hidden
            : doc.status === "draft";
    return matchesSearch && matchesProject && matchesStatus;
  });
  const switchView = (next: "projects" | "documents") => {
    setView(next);
    setSearch("");
    setError("");
    setDocPage(1);
  };
  if (editing)
    return (
      <DocumentEditor
        key={`${editing.productId}/${editing.slug}`}
        initial={editing}
        projects={projects}
        previewProjectId={editingProjectId}
        onBack={() => {
          setEditing(null);
          void load();
        }}
        onSaved={(saved) =>
          setDocuments((current) => [
            ...current.filter(
              (doc) =>
                !(doc.productId === saved.productId && doc.slug === saved.slug),
            ),
            saved,
          ])
        }
      />
    );
  const managedProject = projects.find((p) => p.id === managing);
  const openCreate = () => {
    setError("");
    if (view === "projects") {
      setProjectForm({ name: "", slug: "", description: "" });
    } else {
      setDocTitle("");
      const activeProject = managedProject || projects[0];
      const activeProduct =
        (activeProject && managerLocation.productId
          ? activeProject.products?.find(
              (p) => p.id === managerLocation.productId,
            )
          : null) || activeProject?.products?.[0];

      if (activeProject && activeProduct) {
        setBindings([
          {
            projectId: activeProject.id,
            productId: activeProduct.id,
            categoryId: null,
          },
        ]);
      } else {
        setBindings([]);
      }
      setNewDoc(true);
    }
  };
  const closeForm = () => {
    if (!busy) {
      setProjectForm(null);
      setNewDoc(false);
      setError("");
      setDocTitle("");
      setBindings([]);
    }
  };
  return (
    <div className="admin-shell arco-workspace">
      {!(managedProject && managerLocation.productId) && (
        <aside className="admin-nav">
          <Link href="/" className="workspace-brand">
            <span>
              <Layers3 size={23} />
            </span>
            <div>
              中广云<small>文档管理控制台</small>
            </div>
          </Link>
          <div className="nav-caption">内容工作空间</div>
          <Menu
            selectedKeys={[managedProject ? "projects" : view]}
            onClickMenuItem={(key) => {
              if (key === "projects") {
                setManaging(null);
                setManagerLocation({ productId: "", showUpdates: false });
                switchView("projects");
              } else if (key === "documents") {
                setManaging(null);
                setManagerLocation({ productId: "", showUpdates: false });
                switchView("documents");
              } else if (key === "users") {
                setManaging(null);
                setManagerLocation({ productId: "", showUpdates: false });
                setView("users");
              }
            }}
          >
            <Menu.Item key="projects">
              <LayoutGrid size={17} />
              项目管理<span className="menu-count">{projects.length}</span>
            </Menu.Item>
            <Menu.Item key="documents">
              <BookOpen size={17} />
              文档中心<span className="menu-count">{documents.length}</span>
            </Menu.Item>
            {hasUserPermission(currentUser, "users:manage") && (
              <Menu.Item key="users">
                <Users size={17} />
                用户管理
              </Menu.Item>
            )}
          </Menu>
          <div className="nav-bottom">
            <div className="workspace-tip">
              <FolderOpen size={21} />
              <strong>一份内容，服务多个项目</strong>
              <p>统一维护共享文档，在各项目中按需绑定和独立扩展。</p>
            </div>
            <Link href="/">
              <ArrowLeft size={15} />
              返回文档门户
            </Link>
          </div>
        </aside>
      )}
      <main className="admin-content">
        {managedProject ? (
          <ProjectManager
            project={managedProject}
            documents={documents}
            history={history}
            initialLocation={managerLocation}
            onLocationChange={setManagerLocation}
            onBack={() => {
              setManaging(null);
              setManagerLocation({ productId: "", showUpdates: false });
            }}
            onReload={() => load()}
            onEdit={(doc) => {
              setEditing(doc);
              setEditingProjectId(managedProject.id);
            }}
            onNew={(placement, source) => {
              const id = crypto.randomUUID();
              setEditingProjectId(placement.projectId);
              setEditing({
                id,
                productId: "library",
                slug: id,
                title: source ? `${source.title}（专属副本）` : "未命名文档",
                description: source?.description || "",
                content: source?.content || "",
                breadcrumbs: [],
                status: "draft",
                version: 1,
                updatedAt: "",
                placements: [placement],
                projectIds: [placement.projectId],
                appearance: source?.appearance || defaultAppearance,
              });
            }}
          />
        ) : (
          <>
            <div className="workspace-topbar">
              <Breadcrumb>
                <Breadcrumb.Item>控制台</Breadcrumb.Item>
                <Breadcrumb.Item>
                  {view === "projects"
                    ? "项目管理"
                    : view === "documents"
                      ? "文档中心"
                      : "用户与权限"}
                </Breadcrumb.Item>
              </Breadcrumb>
              <div className="flex items-center gap-3">
                {currentUser && (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white border border-slate-200">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center font-semibold text-white text-xs bg-slate-700">
                      {currentUser.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="text-left leading-tight">
                      <div className="text-xs font-medium text-slate-800 flex items-center gap-1.5">
                        <span>{currentUser.name}</span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          ({currentUser.roleName || currentUser.role})
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <Button
                  type="text"
                  size="small"
                  icon={<LogOut size={14} />}
                  onClick={async () => {
                    if (await confirmAction("确认退出当前管理后台登录？")) {
                      await handleLogout();
                    }
                  }}
                  className="text-slate-500 hover:text-red-600"
                >
                  退出
                </Button>
              </div>
            </div>
            {view === "users" ? (
              currentUser && <UserManager currentUser={currentUser} />
            ) : (
              <div className="workspace-page">
                <header className="page-heading">
                  <div>
                    <h1>{view === "projects" ? "项目管理" : "文档中心"}</h1>
                    <p>
                {view === "projects"
                  ? "管理独立的项目文档站点，组织产品目录与共享内容。"
                  : "统一编写、分类和发布文档，保持多个项目的内容同步。"}
              </p>
            </div>
            <Button
              type="primary"
              icon={<Plus size={16} />}
              disabled={loading}
              onClick={openCreate}
            >
              {view === "projects" ? "新建项目" : "新建文档"}
            </Button>
          </header>
          {error && !projectForm && !newDoc && (
            <Alert
              type="error"
              content={error}
              action={
                <Button
                  type="text"
                  size="small"
                  onClick={() => {
                    setError("");
                    void load();
                  }}
                >
                  重试加载
                </Button>
              }
            />
          )}
          <div className="workspace-stats">
            <div>
              <span>项目总数</span>
              <strong>{projects.length}</strong>
              <LayoutGrid />
            </div>
            <div>
              <span>产品总数</span>
              <strong>
                {projects.reduce(
                  (sum, p) => sum + (p.products?.length || 0),
                  0,
                )}
              </strong>
              <FolderOpen />
            </div>
            <div>
              <span>文档总数</span>
              <strong>{documents.length}</strong>
              <FileText />
            </div>
            <div>
              <span>待发布草稿</span>
              <strong>
                {documents.filter((d) => d.status === "draft").length}
              </strong>
              <Pencil />
            </div>
          </div>
          <section className="workspace-list-panel">
            <div className="list-panel-heading">
              <h2>
                {view === "projects" ? "全部项目" : "文档列表"}
                <span>
                  {view === "projects" ? projects.length : documents.length}
                </span>
              </h2>
              <span className="muted">
                {view === "projects"
                  ? "每个项目拥有独立的访问链接"
                  : "草稿内容仅在后台可见"}
              </span>
            </div>
            <div className="list-controls">
              <Input.Search
                allowClear
                aria-label={view === "projects" ? "搜索项目" : "搜索文档"}
                placeholder={
                  view === "projects"
                    ? "搜索项目名称、链接或描述"
                    : "搜索文档标题或摘要"
                }
                value={search}
                onChange={(val) => {
                  setSearch(val);
                  setDocPage(1);
                }}
                style={{ width: 320, maxWidth: "100%" }}
              />
              {view === "documents" && (
                <>
                  <Select
                    aria-label="按项目筛选"
                    value={projectFilter}
                    onChange={(val) => {
                      setProjectFilter(val);
                      setDocPage(1);
                    }}
                    style={{ width: 180 }}
                    options={[
                      { label: "所有项目", value: "all" },
                      ...projects.map((p) => ({ label: p.name, value: p.id })),
                    ]}
                  />
                  <Select
                    aria-label="按状态筛选"
                    value={statusFilter}
                    onChange={(val) => {
                      setStatusFilter(val);
                      setDocPage(1);
                    }}
                    style={{ width: 140 }}
                    options={[
                      { label: "所有状态", value: "all" },
                      { label: "已发布", value: "published" },
                      { label: "已下架", value: "hidden" },
                      { label: "待发布草稿", value: "draft" },
                    ]}
                  />
                </>
              )}
              <span className="muted result-count">
                共{" "}
                {view === "projects"
                  ? matchedProjects.length
                  : matchedDocs.length}{" "}
                项
              </span>
            </div>
            {loading ? (
              <div className="empty-state">
                <Spin tip="正在加载工作空间" />
              </div>
            ) : view === "projects" ? (
              <div className="project-grid">
                {matchedProjects.map((project, index) => (
                  <article className="project-card" key={project.id}>
                    <div className="project-card-top">
                      <span className={`project-icon tone-${index % 4}`}>
                        <FolderOpen size={25} />
                      </span>
                      <Tag color="arcoblue">独立文档站</Tag>
                      <div className="card-tools">
                        <Button
                          type="text"
                          aria-label={`复制项目 ${project.name}`}
                          icon={<Copy size={15} />}
                          onClick={() =>
                            setProjectForm({
                              copyFrom: project.id,
                            company:project.company,
                            brandName:project.brandName,
                            customFields: project.customFields
                              ? project.customFields.map((f) => ({ ...f }))
                              : [],
                              name: project.name.slice(0, 77) + "_副本",
                              description: project.description,
                              slug:
                                project.slug.slice(0, 55) +
                                "-copy-" +
                                Date.now().toString(36),
                            })
                          }
                        />

                        <Button
                          type="text"
                          shape="square"
                          aria-label={`编辑项目 ${project.name}`}
                          icon={<Pencil size={15} />}
                          disabled={busy}
                          onClick={() => {
                            setError("");
                            setProjectForm(project);
                          }}
                        />
                        <Button
                          type="text"
                          shape="square"
                          status="danger"
                          aria-label={`删除项目 ${project.name}`}
                          icon={<Trash2 size={15} />}
                          disabled={busy}
                          onClick={() => deleteItem("project", project.id)}
                        />
                      </div>
                    </div>
                    <button
                      className="product-title-button"
                      onClick={() => setManaging(project.id)}
                    >
                      {project.name}
                      <ArrowUpRight size={16} />
                    </button>
                    <p>
                      {project.description ||
                        "添加项目介绍，让读者更了解这个文档中心。"}
                    </p>
                    <button
                      className="project-document-count"
                      onClick={() => setManaging(project.id)}
                    >
                      <FolderOpen size={14} />
                      {project.products?.length || 0} 个产品<span>·</span>
                      <FileText size={14} />
                      {
                        documents.filter((d) =>
                          d.projectIds?.includes(project.id),
                        ).length
                      }{" "}
                      篇文档
                    </button>
                    <div className="project-card-footer">
                      <Button
                        type="text"
                        size="small"
                        onClick={() => setManaging(project.id)}
                      >
                        管理目录 →
                      </Button>
                      <Button
                        type="text"
                        size="small"
                        aria-label="复制项目链接"
                        icon={
                          copied === project.id ? (
                            <Check size={14} />
                          ) : (
                            <Copy size={14} />
                          )
                        }
                        onClick={() => copyLink(project)}
                      >
                        {copied === project.id ? "已复制" : "复制链接"}
                      </Button>
                      <Link
                        className="project-visit"
                        href={`/projects/${project.slug}`}
                        target="_blank"
                      >
                        访问
                        <ArrowUpRight size={14} />
                      </Link>
                    </div>
                  </article>
                ))}
                {!matchedProjects.length && (
                  <Empty
                    description={
                      search
                        ? "没有找到匹配的项目"
                        : "还没有项目，点击“新建项目”开始"
                    }
                  />
                )}
              </div>
            ) : (
              <List<DocDetail>
                className="document-admin-list"
                bordered={false}
                dataSource={matchedDocs}
                noDataElement={
                  <div className="py-12">
                    <Empty
                      description={
                        search || projectFilter !== "all" || statusFilter !== "all"
                          ? "没有找到匹配条件的文档"
                          : "还没有文档，点击右上角“新建文档”开始"
                      }
                    />
                  </div>
                }
                pagination={{
                  current: docPage,
                  pageSize: docPageSize,
                  total: matchedDocs.length,
                  onChange: (page, size) => {
                    setDocPage(page);
                    setDocPageSize(size);
                  },
                  showTotal: true,
                  sizeCanChange: true,
                  showJumper: true,
                  sizeOptions: [10, 20, 50],
                }}
                render={(doc) => {
                  const isHidden = doc.hidden;
                  const isDraft = doc.status === "draft";
                  return (
                    <List.Item
                      key={doc.id}
                      className="document-list-card hover:border-blue-200 hover:shadow-sm transition-all p-4 rounded-xl mb-3 border border-gray-100 bg-white"
                      actions={[
                        <Button
                          key="edit"
                          type="text"
                          size="small"
                          icon={<IconEdit />}
                          onClick={() => setEditing(doc)}
                        >
                          编辑
                        </Button>,
                        <Button
                          key="visibility"
                          type="text"
                          size="small"
                          status={isHidden ? "success" : "warning"}
                          icon={isHidden ? <IconEye /> : <IconEyeInvisible />}
                          disabled={busy}
                          onClick={() => toggleVisibility(doc)}
                        >
                          {isHidden ? "上架" : "下架"}
                        </Button>,
                        <Button
                          key="delete"
                          type="text"
                          size="small"
                          status="danger"
                          icon={<IconDelete />}
                          aria-label={`删除文档 ${doc.title}`}
                          disabled={busy}
                          onClick={() => deleteItem("doc", doc.id)}
                        >
                          删除
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0 ${
                              isDraft
                                ? "bg-amber-500"
                                : isHidden
                                  ? "bg-gray-400"
                                  : "bg-blue-600"
                            }`}
                          >
                            <FileText size={18} />
                          </div>
                        }
                        title={
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              className="font-medium text-base text-gray-900 hover:text-blue-600 transition-colors text-left p-0 bg-transparent border-0 cursor-pointer"
                              onClick={() => setEditing(doc)}
                            >
                              {doc.title}
                            </button>
                            {isDraft ? (
                              <Tag color="orange" size="small">
                                待发布草稿
                              </Tag>
                            ) : isHidden ? (
                              <Tag color="red" size="small">
                                已下架
                              </Tag>
                            ) : (
                              <Tag color="green" size="small">
                                已发布 v{doc.version}
                              </Tag>
                            )}
                            {doc.updatedAt && (
                              <span className="text-xs text-gray-400">
                                更新于 {displayDateTime(doc.updatedAt)}
                              </span>
                            )}
                          </div>
                        }
                        description={
                          <div className="mt-1 space-y-1.5">
                            <p className="text-xs text-gray-500 line-clamp-2 m-0">
                              {doc.description || "暂无摘要说明"}
                            </p>
                            {doc.placements && doc.placements.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <FolderOpen size={12} />
                                  绑定目录:
                                </span>
                                {doc.placements.map((p) => (
                                  <Tag
                                    key={placementKey(p)}
                                    size="small"
                                    color="arcoblue"
                                  >
                                    {placementLabel(projects, p)}
                                  </Tag>
                                ))}
                              </div>
                            )}
                          </div>
                        }
                      />
                    </List.Item>
                  );
                }}
              />
            )}
          </section>
        </div>
      )}
    </>
  )}
</main>
      <Modal
        visible={!!projectForm || newDoc}
        title={
          projectForm
            ? projectForm.copyFrom
              ? "复制项目（含完整文档）"
              : projectForm.id
                ? "编辑项目"
                : "新建项目"
            : "新建文档"
        }
        footer={null}
        onCancel={closeForm}
        unmountOnExit
        closable={!busy}
        escToExit={!busy}
        className="workspace-arco-modal project-form-modal"
        wrapClassName="fixed-form-modal-wrapper"
        style={{ width: 620, maxWidth: "calc(100vw - 32px)", height: "70vh" }}
      >
        {error && <Alert type="error" content={error} />}
        {projectForm ? (
          <Form
            layout="vertical"
            onSubmit={saveProject}
            className="mt-4"
          >
            <div style={{ border: "1px solid var(--color-border-secondary)", borderRadius: 8, padding: "16px 16px 4px", marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 12 }}>项目基础信息</div>
            <Form.Item label="项目名称" required>
              <Input
                autoFocus
                required
                maxLength={80}
                value={projectForm.name}
                onChange={(name) => setProjectForm({ ...projectForm, name })}
                placeholder="例如：开发者平台"
              />
            </Form.Item>
            <Form.Item
              label="项目链接标识"
              required
              extra="使用小写字母、数字和连字符；创建后链接保持固定。"
            >
              <Input
                required
                disabled={!!projectForm.id}
                addBefore="/projects/"
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                maxLength={80}
                value={projectForm.slug}
                onChange={(slug) =>
                  setProjectForm({ ...projectForm, slug: slug.toLowerCase() })
                }
                placeholder="developer-platform"
              />
            </Form.Item>
            <Form.Item label="项目说明">
              <Input.TextArea
                rows={3}
                value={projectForm.description}
                onChange={(description) =>
                  setProjectForm({ ...projectForm, description })
                }
                placeholder="向读者介绍这个项目"
              />
            </Form.Item>
            </div>
            <div style={{ border: "1px solid var(--color-border-secondary)", borderRadius: 8, padding: "16px 16px 4px", marginBottom: 16, background: "var(--color-fill-1, rgba(0,0,0,0.015))" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>项目变量</div>
                <Button
                  size="small"
                  type="text"
                  icon={<Plus size={14} />}
                  onClick={() =>
                    setProjectForm({
                      ...projectForm,
                      customFields: [
                        ...(projectForm.customFields || []),
                        { key: "", label: "", value: "" },
                      ],
                    })
                  }
                >
                  添加字段
                </Button>
              </div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 12 }}>
                文档正文用 {"{{变量名}}"} 引用，按项目渲染对应值。brand_name 和 company_name 为系统内置变量：brand_name 为空时用项目名称；company_name 为空时用品牌名称，品牌也为空时用项目名称。
              </div>
              <div style={{ maxHeight: 264, overflowY: "auto", paddingRight: 6, marginRight: -10 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
                <div style={{ width: 140, fontSize: 12, color: "var(--color-text-secondary)", fontFamily: "monospace" }}>brand_name</div>
                <div style={{ width: 130, fontSize: 12, color: "var(--color-text-secondary)" }}>品牌名称（内置）</div>
                <Input
                  style={{ flex: 1 }}
                  placeholder="留空默认使用项目名称"
                  value={projectForm.brandName || ""}
                  onChange={(brandName) =>
                    setProjectForm({ ...projectForm, brandName })
                  }
                />
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
                <div style={{ width: 140, fontSize: 12, color: "var(--color-text-secondary)", fontFamily: "monospace" }}>company_name</div>
                <div style={{ width: 130, fontSize: 12, color: "var(--color-text-secondary)" }}>公司 / 品牌名称（内置）</div>
                <Input
                  style={{ flex: 1 }}
                  placeholder="留空默认使用品牌名称"
                  value={projectForm.company || ""}
                  onChange={(company) =>
                    setProjectForm({ ...projectForm, company })
                  }
                />
              </div>
              {(projectForm.customFields || []).length > 0 && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", margin: "4px 0 10px" }}>自定义字段</div>
                  {(projectForm.customFields || []).map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "flex-start" }}>
                    <Input
                      style={{ width: 140 }}
                      placeholder="变量名 support_phone"
                      value={f.key}
                      onChange={(key) => {
                        const next = [...(projectForm.customFields || [])];
                        next[i] = { ...f, key };
                        setProjectForm({ ...projectForm, customFields: next });
                      }}
                    />
                    <Input
                      style={{ width: 130 }}
                      placeholder="显示名 支持电话"
                      value={f.label}
                      onChange={(label) => {
                        const next = [...(projectForm.customFields || [])];
                        next[i] = { ...f, label };
                        setProjectForm({ ...projectForm, customFields: next });
                      }}
                    />
                    <Input
                      style={{ flex: 1 }}
                      placeholder="值 400-123-4567"
                      value={f.value}
                      onChange={(value) => {
                        const next = [...(projectForm.customFields || [])];
                        next[i] = { ...f, value };
                        setProjectForm({ ...projectForm, customFields: next });
                      }}
                    />
                    <Button
                      type="text"
                      shape="square"
                      aria-label="删除字段"
                      icon={<Trash2 size={14} />}
                      onClick={() => {
                        const next = [...(projectForm.customFields || [])];
                        next.splice(i, 1);
                        setProjectForm({ ...projectForm, customFields: next });
                      }}
                    />
                  </div>
                  ))}
                  {customFieldsIncomplete(projectForm.customFields) && (
                    <div style={{ fontSize: 12, color: "rgb(var(--red-6))", margin: "-2px 0 10px" }}>
                      变量名和值为必填，且变量名不能重复：请修正或删除多余字段后再保存
                    </div>
                  )}
                </>
              )}
              </div>
            </div>
            <div className="modal-form-footer">
              <Button disabled={busy} onClick={closeForm}>
                取消
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={busy}
                disabled={customFieldsIncomplete(projectForm.customFields)}
              >
                {projectForm.copyFrom
                  ? "复制项目"
                  : projectForm.id
                    ? "保存修改"
                    : "创建项目"}
              </Button>
            </div>
          </Form>
        ) : (
          <Form
            layout="vertical"
            onSubmit={createDocument}
            className="mt-4"
          >
            <Form.Item label="文档标题" required>
              <Input
                autoFocus
                required
                maxLength={160}
                value={docTitle}
                onChange={setDocTitle}
                placeholder="例如：快速开始"
              />
            </Form.Item>
            <Form.Item
              label="绑定目录"
              required
              extra="选择文档归属的项目、产品及分类，发布后读者可在对应目录中查阅。"
            >
              <PlacementPicker
                projects={projects}
                value={bindings}
                onChange={setBindings}
              />
            </Form.Item>
            <div className="modal-form-footer">
              <Button onClick={closeForm}>取消</Button>
              <Button
                type="primary"
                htmlType="submit"
                disabled={
                  !projects.length ||
                  !docTitle.trim() ||
                  !bindings.length ||
                  !bindings.every((b) => b.projectId && b.productId)
                }
              >
                创建并编辑
              </Button>
            </div>
          </Form>
        )}
      </Modal>
    </div>
  );
}
