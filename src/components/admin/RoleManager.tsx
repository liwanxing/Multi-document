"use client";

import React, { useState, useEffect, useImperativeHandle, forwardRef } from "react";
import {
  Table,
  Button,
  Input,
  Modal,
  Message,
  Alert,
  Form,
  Checkbox,
  Popconfirm,
  Tooltip,
} from "@arco-design/web-react";
import { IconEdit, IconDelete } from "@arco-design/web-react/icon";
import { ShieldCheck, Shield, FolderKanban, FileText, Settings, Users } from "lucide-react";
import {
  RoleDefinition,
  Permission,
  PERMISSION_GROUPS,
  ALL_PERMISSIONS,
} from "@/lib/authTypes";

export interface RoleWithStats extends RoleDefinition {
  userCount?: number;
}

export interface RoleManagerRef {
  openCreateModal: () => void;
  fetchRoles: () => Promise<void>;
}

interface RoleManagerProps {
  onRolesChange?: () => void;
}

const RoleManager = forwardRef<RoleManagerRef, RoleManagerProps>(function RoleManager(
  { onRolesChange },
  ref
) {
  const [roles, setRoles] = useState<RoleWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleWithStats | null>(null);
  const [form] = Form.useForm();
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function fetchRoles() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/roles", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || data.code !== 0) {
        throw new Error(data.message || "获取角色列表失败");
      }
      setRoles(data.data || []);
      if (onRolesChange) onRolesChange();
    } catch (err: any) {
      Message.error(err.message || "加载角色失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchRoles();
  }, []);

  const openCreateModal = () => {
    setEditingRole(null);
    form.resetFields();
    setSelectedPermissions(["projects:view", "docs:view", "docs:edit"]);
    setModalVisible(true);
  };

  const openEditModal = (role: RoleWithStats) => {
    setEditingRole(role);
    form.resetFields();
    form.setFieldsValue({
      id: role.id,
      name: role.name,
      description: role.description,
    });
    setSelectedPermissions(role.permissions || []);
    setModalVisible(true);
  };

  useImperativeHandle(ref, () => ({
    openCreateModal,
    fetchRoles,
  }));

  const togglePermission = (perm: Permission) => {
    if (editingRole?.id === "admin") {
      Message.info("超级管理员默认保留全量功能权限");
      return;
    }
    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const toggleGroupAll = (groupPerms: Permission[]) => {
    if (editingRole?.id === "admin") return;
    const allSelected = groupPerms.every((p) => selectedPermissions.includes(p));
    if (allSelected) {
      setSelectedPermissions((prev) => prev.filter((p) => !groupPerms.includes(p)));
    } else {
      setSelectedPermissions((prev) => Array.from(new Set([...prev, ...groupPerms])));
    }
  };

  const handleSaveRole = async () => {
    try {
      const values = await form.validate();
      if (selectedPermissions.length === 0) {
        Message.warning("请为该角色至少勾选一项功能权限");
        return;
      }

      setSubmitting(true);
      const isEdit = !!editingRole;
      const url = "/api/admin/roles";
      const method = isEdit ? "PATCH" : "POST";
      const payload = {
        id: isEdit ? editingRole.id : values.id.trim().toLowerCase(),
        name: values.name.trim(),
        description: values.description?.trim() || "",
        color: "blue",
        permissions: selectedPermissions,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.code !== 0) {
        throw new Error(data.message || "保存角色失败");
      }

      Message.success(isEdit ? "角色权限更新成功" : "新建角色成功");
      setModalVisible(false);
      void fetchRoles();
    } catch (err: any) {
      Message.error(err.message || "保存角色异常");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async (id: string) => {
    try {
      const res = await fetch("/api/admin/roles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok || data.code !== 0) {
        throw new Error(data.message || "删除角色失败");
      }
      Message.success("角色已成功删除");
      void fetchRoles();
    } catch (err: any) {
      Message.error(err.message || "删除角色失败");
    }
  };

  const columns = [
    {
      title: "角色名称与标识",
      width: 220,
      render: (_: any, record: RoleWithStats) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800 text-sm">{record.name}</span>
          <span className="text-xs text-slate-400 font-mono">@{record.id}</span>
          {record.isSystem && (
            <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-normal">
              内置
            </span>
          )}
        </div>
      ),
    },
    {
      title: "职责说明",
      dataIndex: "description",
      render: (desc: string) => (
        <span className="text-xs text-slate-500 line-clamp-1">{desc || "—"}</span>
      ),
    },
    {
      title: "关联成员",
      width: 120,
      dataIndex: "userCount",
      render: (count: number) => (
        <span className="text-xs text-slate-600 font-medium">
          {count || 0} 位用户
        </span>
      ),
    },
    {
      title: "功能权限清单",
      render: (_: any, record: RoleWithStats) => {
        if (record.id === "admin") {
          return (
            <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
              <ShieldCheck size={14} className="text-blue-600 shrink-0" />
              <span>全量功能权限（全部开放）</span>
            </div>
          );
        }

        const count = record.permissions?.length || 0;
        const allList = PERMISSION_GROUPS.flatMap((g) => g.permissions);
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            {record.permissions?.slice(0, 3).map((p) => {
              const label = allList.find((x) => x.key === p)?.label || p;
              return (
                <span
                  key={p}
                  className="inline-block text-[11px] px-2 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200/80"
                >
                  {label}
                </span>
              );
            })}
            {count > 3 && (
              <Tooltip
                content={
                  <div className="space-y-1 p-1 max-w-xs">
                    <div className="font-semibold text-xs border-b border-slate-600/40 pb-1 mb-1">
                      全部权限 ({count} 项)：
                    </div>
                    {record.permissions.map((p) => {
                      const label = allList.find((x) => x.key === p)?.label || p;
                      return (
                        <div key={p} className="text-xs text-slate-200">
                          • {label}
                        </div>
                      );
                    })}
                  </div>
                }
                position="top"
              >
                <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200 cursor-pointer transition-colors">
                  +{count - 3} 项
                </span>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: "操作",
      width: 140,
      render: (_: any, record: RoleWithStats) => {
        const canDelete =
          !record.isSystem && record.id !== "admin" && (record.userCount || 0) === 0;
        return (
          <div className="flex items-center gap-1">
            <Button
              type="text"
              size="small"
              icon={<IconEdit />}
              onClick={() => openEditModal(record)}
            >
              配置权限
            </Button>

            {!record.isSystem && record.id !== "admin" && (
              canDelete ? (
                <Popconfirm
                  title="确认删除该角色？"
                  content="删除后将永久移除该角色配置。"
                  okText="确认删除"
                  cancelText="取消"
                  onOk={() => handleDeleteRole(record.id)}
                >
                  <Button type="text" size="small" status="danger" icon={<IconDelete />}>
                    删除
                  </Button>
                </Popconfirm>
              ) : (
                <Tooltip
                  content={`该角色下有 ${record.userCount} 位用户正在使用，无法直接删除`}
                  position="top"
                >
                  <Button type="text" size="small" disabled icon={<IconDelete />}>
                    删除
                  </Button>
                </Tooltip>
              )
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Roles table */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          data={roles}
          pagination={false}
          className="arco-clean-table"
        />
      </div>

      {/* Create / Edit Role Modal */}
      <Modal
        title={editingRole ? `配置角色权限 - ${editingRole.name}` : "新建系统角色"}
        visible={modalVisible}
        onOk={handleSaveRole}
        confirmLoading={submitting}
        onCancel={() => setModalVisible(false)}
        okText="保存配置"
        cancelText="取消"
        style={{ width: 680, maxWidth: "calc(100vw - 32px)" }}
      >
        <Form form={form} layout="vertical">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              label="角色标识 (ID)"
              field="id"
              rules={[
                { required: true, message: "请输入角色标识代码" },
                { match: /^[a-z0-9_-]{2,30}$/, message: "支持 2~30 位小写英文字母、数字或下划线" },
              ]}
              extra="在系统代码中用于唯一识别该角色"
            >
              <Input
                placeholder="例如：doc_reviewer"
                disabled={!!editingRole}
              />
            </Form.Item>

            <Form.Item
              label="角色显示名称"
              field="name"
              rules={[{ required: true, message: "请输入角色显示名称" }]}
            >
              <Input placeholder="例如：文档质检审核员" />
            </Form.Item>
          </div>

          <Form.Item label="职责说明" field="description">
            <Input placeholder="简要说明该角色的业务范围与职责" />
          </Form.Item>

          {/* Permission Matrix */}
          <div className="mt-2 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                <Shield size={16} className="text-blue-600" />
                功能权限配置
                <span className="text-xs text-slate-400 font-normal">
                  （已选 {selectedPermissions.length} / {ALL_PERMISSIONS.length} 项）
                </span>
              </div>
              {editingRole?.id !== "admin" && (
                <div className="flex items-center gap-2">
                  <Button
                    type="secondary"
                    size="mini"
                    onClick={() => setSelectedPermissions([...ALL_PERMISSIONS])}
                  >
                    全选
                  </Button>
                  <Button
                    type="secondary"
                    size="mini"
                    onClick={() => setSelectedPermissions([])}
                  >
                    清空
                  </Button>
                </div>
              )}
            </div>

            {editingRole?.id === "admin" && (
              <Alert
                type="info"
                content="超级管理员属于系统内置顶层角色，默认享有全站所有功能权限。"
                className="mb-3"
              />
            )}

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {PERMISSION_GROUPS.map((group) => {
                const groupPermKeys = group.permissions.map((p) => p.key);
                const allGroupChecked = groupPermKeys.every((k) =>
                  selectedPermissions.includes(k)
                );
                const someGroupChecked =
                  groupPermKeys.some((k) => selectedPermissions.includes(k)) &&
                  !allGroupChecked;

                return (
                  <div
                    key={group.groupKey}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/50"
                  >
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                      <div className="font-semibold text-xs text-slate-700 flex items-center gap-1.5">
                        {group.groupKey === "projects" && <FolderKanban size={13} className="text-blue-500" />}
                        {group.groupKey === "docs" && <FileText size={13} className="text-indigo-500" />}
                        {group.groupKey === "system" && <Settings size={13} className="text-purple-500" />}
                        <span>{group.groupTitle}</span>
                      </div>
                      {editingRole?.id !== "admin" && (
                        <Checkbox
                          checked={allGroupChecked}
                          indeterminate={someGroupChecked}
                          onChange={() => toggleGroupAll(groupPermKeys)}
                        >
                          <span className="text-xs text-slate-500">组全选</span>
                        </Checkbox>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {group.permissions.map((item) => {
                        const checked = selectedPermissions.includes(item.key);
                        return (
                          <div
                            key={item.key}
                            onClick={() => togglePermission(item.key)}
                            className={`p-2.5 rounded border transition-colors cursor-pointer select-none flex items-start gap-2.5 ${
                              checked
                                ? "bg-white border-blue-400 shadow-xs"
                                : "bg-white border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <Checkbox
                              checked={checked}
                              disabled={editingRole?.id === "admin"}
                              className="mt-0.5"
                            />
                            <div className="leading-tight">
                              <div className="font-medium text-xs text-slate-800">
                                {item.label}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {item.description}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Form>
      </Modal>
    </div>
  );
});

export default RoleManager;
