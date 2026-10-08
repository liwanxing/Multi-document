"use client";

import IconPicker from "./IconPicker";
import { useState } from "react";
import {
  Button,
  Modal,
  Input,
  Message,
  Table,
  Tag,
  Space,
  Tooltip,
} from "@arco-design/web-react";
import {
  IconEdit,
  IconDelete,
  IconEye,
  IconEyeInvisible,
  IconPlus,
} from "@arco-design/web-react/icon";
import { ArrowLeft, FolderTree, Package, Search } from "lucide-react";
import type { Project } from "@/lib/dataStore";
import { resolveGroupIcon } from "@/lib/projectModel";

export default function ProductGroups({
  project,
  onReload,
  onBack,
}: {
  project: Project;
  onReload: () => Promise<void>;
  onBack?: () => void;
}) {
  const [icon, setIcon] = useState("folder");
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  const groups = Array.from(
    new Set([
      ...(project.productGroups || []),
      ...(project.products || []).map((p) => p.group),
    ]),
  );

  const filteredGroups = search.trim()
    ? groups.filter((g) => g.toLowerCase().includes(search.toLowerCase().trim()))
    : groups;

  const openCreateModal = () => {
    setEditing(null);
    setName("");
    setIcon("folder");
    setModalVisible(true);
  };

  const openEditModal = (group: string) => {
    const currentIcon =
      project.groupIcons?.[group] || resolveGroupIcon(group, project.groupIcons);
    setEditing(group);
    setName(group);
    setIcon(currentIcon);
    setModalVisible(true);
  };

  async function save(action: string, group?: string) {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          action,
          name: group ?? name,
          oldName: editing,
          icon,
          hidden: !project.hiddenProductGroups?.includes(group || name),
        }),
      });
      const j = await r.json();
      if (!r.ok) throw Error(j.message);
      await onReload();
      setName("");
      setEditing(null);
      setIcon("folder");
      setModalVisible(false);
      Message.success(action === "delete-group" ? "产品分类已删除" : "产品分类已更新");
    } catch (e) {
      Message.error(e instanceof Error ? e.message : "更新失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleQuickIconChange(group: string, newIcon: string) {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          action: "save-group",
          name: group,
          oldName: group,
          icon: newIcon,
          hidden: project.hiddenProductGroups?.includes(group),
        }),
      });
      const j = await r.json();
      if (!r.ok) throw Error(j.message);
      await onReload();
      Message.success(`已更新「${group}」分类图标`);
    } catch (e) {
      Message.error(e instanceof Error ? e.message : "更新图标失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="manager-page groups-manager max-w-[1200px] mx-auto py-2">
      {/* 顶部标题栏与操作 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
        <div>
          {onBack && (
            <Button
              type="text"
              size="small"
              className="text-gray-500 hover:text-blue-600 mb-2 -ml-2 flex items-center gap-1.5"
              onClick={onBack}
            >
              <ArrowLeft size={14} />
              返回产品列表
            </Button>
          )}
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-blue-50 text-[#1664FF]">
              <FolderTree size={20} />
            </span>
            <div>
              <h1 className="text-xl font-bold text-gray-900 m-0 leading-tight">
                {project.name} · 产品分类管理
              </h1>
              <p className="text-xs text-gray-500 mt-1 mb-0">
                管理项目首页的产品分组分类、设置分类专属图标，并控制前台上下架展示状态。
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="primary"
            icon={<IconPlus />}
            className="flex items-center gap-1.5"
            onClick={openCreateModal}
          >
            新增分类
          </Button>
        </div>
      </div>

      {/* 分类列表表格卡片 */}
      <div className="rounded-xl border border-gray-200/80 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-semibold text-gray-800">分类列表</span>
            <Tag color="arcoblue" className="px-2 py-0.5 text-xs">
              共 {groups.length} 个分类
            </Tag>
            <span className="text-xs text-gray-400">
              (点击图标可直接快速更换)
            </span>
          </div>
          <Input
            allowClear
            prefix={<Search size={14} className="text-gray-400" />}
            placeholder="搜索分类名称..."
            value={search}
            onChange={setSearch}
            style={{ width: 220 }}
          />
        </div>

        <Table
          rowKey={(record) => record}
          data={filteredGroups}
          pagination={filteredGroups.length > 10 ? { pageSize: 10, showTotal: true } : false}
          noDataElement={
            <div className="py-12 text-center text-gray-400 text-xs">
              {search ? "没有找到匹配的分类" : "当前项目尚未配置产品分类，请点击右上角新增。"}
            </div>
          }
          columns={[
            {
              title: "分类图标",
              width: 100,
              render: (_, group: string) => {
                const currentIcon =
                  project.groupIcons?.[group] ||
                  resolveGroupIcon(group, project.groupIcons);
                return (
                  <div className="py-1">
                    <IconPicker
                      value={currentIcon}
                      compact={true}
                      disabled={busy}
                      onChange={(newIcon) =>
                        void handleQuickIconChange(group, newIcon)
                      }
                    />
                  </div>
                );
              },
            },
            {
              title: "分类名称",
              dataIndex: "name",
              render: (_, group: string) => {
                return (
                  <span className="font-semibold text-sm text-gray-800">
                    {group}
                  </span>
                );
              },
            },
            {
              title: "关联产品",
              width: 160,
              render: (_, group: string) => {
                const related =
                  project.products?.filter((p) => p.group === group) || [];
                return related.length > 0 ? (
                  <Tooltip
                    content={
                      <div className="text-xs">
                        包含产品：{related.map((p) => p.name).join("、")}
                      </div>
                    }
                  >
                    <Tag
                      color="blue"
                      className="cursor-pointer [&_.arco-tag-content]:inline-flex [&_.arco-tag-content]:items-center [&_.arco-tag-content]:gap-1"
                    >
                      <Package size={12} />
                      {related.length} 款产品
                    </Tag>
                  </Tooltip>
                ) : (
                  <Tag color="gray">0 款产品 (空分类)</Tag>
                );
              },
            },
            {
              title: "前台展示状态",
              width: 130,
              render: (_, group: string) => {
                const isHidden = project.hiddenProductGroups?.includes(group);
                return isHidden ? (
                  <Tag color="orange" bordered>
                    已下架隐藏
                  </Tag>
                ) : (
                  <Tag color="green" bordered>
                    前台展示中
                  </Tag>
                );
              },
            },
            {
              title: "操作",
              width: 200,
              render: (_, group: string) => {
                const count =
                  project.products?.filter((p) => p.group === group).length || 0;
                const isHidden = project.hiddenProductGroups?.includes(group);

                return (
                  <Space size={6}>
                    <Button
                      type="text"
                      size="small"
                      icon={<IconEdit />}
                      disabled={busy}
                      onClick={() => openEditModal(group)}
                    >
                      编辑
                    </Button>
                    <Button
                      type="text"
                      size="small"
                      icon={isHidden ? <IconEye /> : <IconEyeInvisible />}
                      disabled={busy}
                      onClick={() => save("set-group-visibility", group)}
                    >
                      {isHidden ? "上架" : "下架"}
                    </Button>
                    <Button
                      type="text"
                      status="danger"
                      size="small"
                      icon={<IconDelete />}
                      disabled={busy || count > 0}
                      title={count ? "请先移出该分类下的产品后再删除" : "删除空分类"}
                      onClick={() => save("delete-group", group)}
                    >
                      删除
                    </Button>
                  </Space>
                );
              },
            },
          ]}
        />
      </div>

      {/* 新增 / 编辑分类弹窗 */}
      <Modal
        title={editing ? `编辑分类 - ${editing}` : "新增产品分类"}
        visible={modalVisible}
        onCancel={() => {
          if (!busy) setModalVisible(false);
        }}
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <Button
              disabled={busy}
              onClick={() => setModalVisible(false)}
            >
              取消
            </Button>
            <Button
              type="primary"
              loading={busy}
              disabled={!name.trim()}
              onClick={() => save("save-group")}
            >
              {editing ? "保存修改" : "确认新增"}
            </Button>
          </div>
        }
        unmountOnExit
        className="workspace-arco-modal"
        style={{ width: 480, maxWidth: "calc(100vw - 32px)" }}
      >
        <div className="space-y-4 py-1">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              分类名称 <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2.5">
              <IconPicker
                value={icon}
                onChange={setIcon}
                className="!w-10 !h-10"
              />
              <Input
                aria-label="产品分类名称"
                value={name}
                maxLength={80}
                size="large"
                placeholder="请输入产品分类名称，例如：人工智能与算法"
                onChange={setName}
                onPressEnter={() => {
                  if (name.trim() && !busy) void save("save-group");
                }}
                autoFocus
                className="flex-1"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1 mb-0">
              点击左侧图标可更换分类图标；名称将展示在项目文档首页的左侧分组导航中，重命名会同步更新关联产品。
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
