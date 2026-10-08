"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Table,
  Button,
  Input,
  Select,
  Modal,
  Badge,
  Message,
  Alert,
  Form,
  Radio,
  Popconfirm,
  Tabs,
} from "@arco-design/web-react";
import {
  IconSearch,
  IconPlus,
  IconEdit,
  IconDelete,
} from "@arco-design/web-react/icon";
import {
  Users,
  Shield,
  UserCheck,
  UserX,
  KeyRound,
} from "lucide-react";
import { SafeAdminUser, RoleDefinition, ROLE_LABELS, PERMISSION_GROUPS } from "@/lib/authTypes";
import { displayDateTime } from "@/lib/dates";
import RoleManager, { RoleManagerRef } from "./RoleManager";

interface UserManagerProps {
  currentUser: SafeAdminUser;
}

export default function UserManager({ currentUser }: UserManagerProps) {
  const [users, setUsers] = useState<SafeAdminUser[]>([]);
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [activeTab, setActiveTab] = useState<string>("users");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const roleManagerRef = useRef<RoleManagerRef>(null);

  // Create User Modal
  const [createVisible, setCreateVisible] = useState(false);
  const [createForm] = Form.useForm();
  const [createLoading, setCreateLoading] = useState(false);
  const [selectedCreateRole, setSelectedCreateRole] = useState<string>("editor");

  // Edit User Modal
  const [editingUser, setEditingUser] = useState<SafeAdminUser | null>(null);
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);

  // Reset Password Modal
  const [passwordUser, setPasswordUser] = useState<SafeAdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || data.code !== 0) {
        throw new Error(data.message || "获取用户列表失败");
      }
      setUsers(data.data || []);
    } catch (err: any) {
      Message.error(err.message || "无法加载用户列表");
    } finally {
      setLoading(false);
    }
  }

  async function fetchRoles() {
    try {
      const res = await fetch("/api/admin/roles", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.code === 0) {
        setRoles(data.data || []);
      }
    } catch {
      // ignore
    }
  }

  async function reloadAll() {
    await Promise.all([fetchUsers(), fetchRoles()]);
  }

  useEffect(() => {
    void reloadAll();
  }, []);

  const handleCreate = async () => {
    try {
      const values = await createForm.validate();
      setCreateLoading(true);
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok || data.code !== 0) {
        throw new Error(data.message || "创建用户失败");
      }
      Message.success("用户创建成功");
      setCreateVisible(false);
      createForm.resetFields();
      void reloadAll();
    } catch (err: any) {
      Message.error(err.message || "创建用户异常");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editingUser) return;
    try {
      const values = await editForm.validate();
      setEditLoading(true);
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingUser.id,
          ...values,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.code !== 0) {
        throw new Error(data.message || "更新用户信息失败");
      }
      Message.success("用户信息已更新");
      setEditingUser(null);
      void reloadAll();
    } catch (err: any) {
      Message.error(err.message || "更新异常");
    } finally {
      setEditLoading(false);
    }
  };

  const handleToggleStatus = async (user: SafeAdminUser) => {
    const nextStatus = user.status === "active" ? "disabled" : "active";
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          status: nextStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.code !== 0) {
        throw new Error(data.message || "操作失败");
      }
      Message.success(`已${nextStatus === "active" ? "启用" : "停用"}账号 "${user.name}"`);
      void fetchUsers();
    } catch (err: any) {
      Message.error(err.message || "操作失败");
    }
  };

  const handleResetPassword = async () => {
    if (!passwordUser || !newPassword.trim()) return;
    if (newPassword.trim().length < 6) {
      Message.warning("新密码长度至少需要 6 个字符");
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await fetch("/api/admin/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: passwordUser.id,
          newPassword: newPassword.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.code !== 0) {
        throw new Error(data.message || "重置密码失败");
      }
      Message.success(`账号 "${passwordUser.name}" 密码重置成功`);
      setPasswordUser(null);
      setNewPassword("");
    } catch (err: any) {
      Message.error(err.message || "重置密码异常");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok || data.code !== 0) {
        throw new Error(data.message || "删除用户失败");
      }
      Message.success("用户已删除");
      void reloadAll();
    } catch (err: any) {
      Message.error(err.message || "删除用户失败");
    }
  };

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (statusFilter !== "all" && u.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        u.username.toLowerCase().includes(q) ||
        u.name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const stats = {
    total: users.length,
    rolesCount: roles.length,
    active: users.filter((u) => u.status === "active").length,
    disabled: users.filter((u) => u.status === "disabled").length,
  };

  const columns = [
    {
      title: "用户账号",
      dataIndex: "username",
      width: 240,
      render: (_: any, record: SafeAdminUser) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-slate-700 text-xs bg-slate-100 border border-slate-200 shrink-0">
            {record.name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="font-medium text-slate-900 text-sm flex items-center gap-1.5">
              <span>{record.name}</span>
              {record.id === currentUser.id && (
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-600 font-normal">
                  当前
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 font-mono">@{record.username}</div>
          </div>
        </div>
      ),
    },
    {
      title: "系统角色",
      dataIndex: "role",
      width: 140,
      render: (roleId: string, record: SafeAdminUser) => {
        const roleDef = roles.find((r) => r.id === roleId);
        const name = record.roleName || roleDef?.name || ROLE_LABELS[roleId]?.label || roleId;
        return (
          <span className="inline-block text-xs px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium">
            {name}
          </span>
        );
      },
    },
    {
      title: "生效权限",
      render: (_: any, record: SafeAdminUser) => {
        if (record.role === "admin") {
          return <span className="text-xs text-slate-600">全量功能权限（全部开放）</span>;
        }

        const count = record.permissions?.length || 0;
        const allList = PERMISSION_GROUPS.flatMap((g) => g.permissions);
        return (
          <div className="flex items-center gap-1 flex-wrap">
            {record.permissions?.slice(0, 3).map((p) => {
              const label = allList.find((x) => x.key === p)?.label || p;
              return (
                <span
                  key={p}
                  className="text-[11px] px-2 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200"
                >
                  {label}
                </span>
              );
            })}
            {count > 3 && (
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">
                +{count - 3} 项
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: "账号状态",
      dataIndex: "status",
      width: 110,
      render: (status: string) => (
        <Badge
          status={status === "active" ? "processing" : "default"}
          text={status === "active" ? "正常" : "已停用"}
        />
      ),
    },
    {
      title: "最近登录",
      dataIndex: "lastLoginAt",
      width: 160,
      render: (lastLoginAt?: string | null) => (
        <span className="text-xs text-slate-400">
          {lastLoginAt ? displayDateTime(lastLoginAt) : "尚未登录"}
        </span>
      ),
    },
    {
      title: "操作",
      width: 170,
      render: (_: any, record: SafeAdminUser) => {
        const isSelf = record.id === currentUser.id;
        return (
          <div className="flex items-center gap-1">
            <Button
              type="text"
              size="small"
              icon={<IconEdit />}
              onClick={() => {
                setEditingUser(record);
                editForm.setFieldsValue({
                  name: record.name,
                  role: record.role,
                  status: record.status,
                });
              }}
            >
              编辑
            </Button>

            <Button
              type="text"
              size="small"
              icon={<KeyRound size={13} />}
              onClick={() => {
                setPasswordUser(record);
                setNewPassword("");
              }}
            >
              改密
            </Button>

            {!isSelf && (
              <Button
                type="text"
                size="small"
                status={record.status === "active" ? "warning" : "success"}
                onClick={() => handleToggleStatus(record)}
              >
                {record.status === "active" ? "停用" : "启用"}
              </Button>
            )}

            {!isSelf && (
              <Popconfirm
                title="确认删除该用户？"
                content="删除后该账号将无法再登录后台系统。"
                okText="确认删除"
                cancelText="取消"
                onOk={() => handleDelete(record.id)}
              >
                <Button type="text" size="small" status="danger" icon={<IconDelete />}>
                  删除
                </Button>
              </Popconfirm>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="workspace-page">
      {/* Top Header */}
      <header className="page-heading">
        <div>
          <h1>用户与权限</h1>
          <p>管理后台系统账号，集中配置角色职责与功能权限。</p>
        </div>
        {activeTab === "users" ? (
          <Button
            type="primary"
            icon={<IconPlus />}
            onClick={() => {
              createForm.resetFields();
              createForm.setFieldsValue({ role: "editor" });
              setSelectedCreateRole("editor");
              setCreateVisible(true);
            }}
          >
            新建用户
          </Button>
        ) : (
          <Button
            type="primary"
            icon={<IconPlus />}
            onClick={() => roleManagerRef.current?.openCreateModal()}
          >
            新建角色
          </Button>
        )}
      </header>

      {/* Stats Summary */}
      <div className="workspace-stats">
        <div>
          <span>用户总数</span>
          <strong>{stats.total}</strong>
          <Users size={22} className="text-slate-400" />
        </div>
        <div>
          <span>系统角色</span>
          <strong>{stats.rolesCount}</strong>
          <Shield size={22} className="text-slate-400" />
        </div>
        <div>
          <span>正常账号</span>
          <strong>{stats.active}</strong>
          <UserCheck size={22} className="text-slate-400" />
        </div>
        <div>
          <span>已停用</span>
          <strong>{stats.disabled}</strong>
          <UserX size={22} className="text-slate-400" />
        </div>
      </div>

      {/* Clean Tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        type="line"
        className="console-tabs mt-2"
      >
        <Tabs.TabPane
          key="users"
          title={`用户账号 (${users.length})`}
        >
          <div className="pt-3 space-y-4">
            {/* Filter & Search Bar */}
            <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                  <Input
                    prefix={<IconSearch className="text-slate-400" />}
                    placeholder="搜索用户名或姓名..."
                    value={search}
                    onChange={setSearch}
                    allowClear
                    className="max-w-xs"
                  />
                  <Select
                    value={roleFilter}
                    onChange={setRoleFilter}
                    className="w-36"
                  >
                    <Select.Option value="all">全部角色</Select.Option>
                    {roles.map((r) => (
                      <Select.Option key={r.id} value={r.id}>
                        {r.name}
                      </Select.Option>
                    ))}
                  </Select>
                  <Select
                    value={statusFilter}
                    onChange={setStatusFilter}
                    className="w-32"
                  >
                    <Select.Option value="all">全部状态</Select.Option>
                    <Select.Option value="active">正常</Select.Option>
                    <Select.Option value="disabled">已停用</Select.Option>
                  </Select>
                </div>
                <Button onClick={reloadAll} loading={loading}>
                  刷新
                </Button>
              </div>

              {/* User Table */}
              <div className="mt-4 border-t border-slate-100 pt-2">
                <Table
                  rowKey="id"
                  loading={loading}
                  columns={columns}
                  data={filteredUsers}
                  pagination={{ pageSize: 10, showTotal: true }}
                />
              </div>
            </div>
          </div>
        </Tabs.TabPane>

        <Tabs.TabPane
          key="roles"
          title={`角色与权限 (${roles.length})`}
        >
          <div className="pt-3">
            <RoleManager ref={roleManagerRef} onRolesChange={reloadAll} />
          </div>
        </Tabs.TabPane>
      </Tabs>

      {/* Create User Modal */}
      <Modal
        title="新建后台用户"
        visible={createVisible}
        onOk={handleCreate}
        confirmLoading={createLoading}
        onCancel={() => setCreateVisible(false)}
        okText="立即创建"
        cancelText="取消"
        style={{ width: 500 }}
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            label="用户名"
            field="username"
            rules={[
              { required: true, message: "请输入用户名" },
              { minLength: 2, message: "至少 2 个字符" },
              { match: /^[a-zA-Z0-9_-]+$/, message: "用户名仅支持英文字母、数字及下划线" },
            ]}
          >
            <Input placeholder="例如：editor_wang" />
          </Form.Item>

          <Form.Item
            label="显示姓名"
            field="name"
            rules={[{ required: true, message: "请输入显示姓名" }]}
          >
            <Input placeholder="例如：王小明（内容运营）" />
          </Form.Item>

          <Form.Item
            label="初始登录密码"
            field="password"
            rules={[
              { required: true, message: "请输入初始密码" },
              { minLength: 6, message: "密码至少 6 个字符" },
            ]}
          >
            <Input.Password placeholder="至少 6 位字符" />
          </Form.Item>

          <Form.Item
            label="分配角色"
            field="role"
            rules={[{ required: true, message: "请选择用户角色" }]}
          >
            <Select
              placeholder="选择分配角色"
              onChange={(val) => setSelectedCreateRole(val)}
            >
              {roles.map((r) => (
                <Select.Option key={r.id} value={r.id}>
                  <div className="flex items-center justify-between w-full pr-2">
                    <span className="font-medium text-slate-800">{r.name}</span>
                    <span className="text-xs text-slate-400 font-mono">@{r.id}</span>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* Role Preview */}
          {selectedCreateRole && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1 mt-1 text-slate-600">
              <div>
                职责说明：{roles.find((r) => r.id === selectedCreateRole)?.description || "—"}
              </div>
              <div className="text-slate-400">
                具备权限：{roles.find((r) => r.id === selectedCreateRole)?.permissions.length || 0} 项
              </div>
            </div>
          )}
        </Form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        title={`编辑用户 - ${editingUser?.name}`}
        visible={!!editingUser}
        onOk={handleEdit}
        confirmLoading={editLoading}
        onCancel={() => setEditingUser(null)}
        okText="保存修改"
        cancelText="取消"
        style={{ width: 500 }}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item label="显示姓名" field="name" rules={[{ required: true }]}>
            <Input placeholder="用户显示姓名" />
          </Form.Item>

          <Form.Item label="分配角色" field="role" rules={[{ required: true }]}>
            <Select disabled={editingUser?.id === currentUser.id}>
              {roles.map((r) => (
                <Select.Option key={r.id} value={r.id}>
                  <div className="flex items-center justify-between w-full pr-2">
                    <span>{r.name}</span>
                    <span className="text-xs text-slate-400 font-mono">@{r.id}</span>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {editingUser?.id !== currentUser.id && (
            <Form.Item label="账号状态" field="status">
              <Radio.Group>
                <Radio value="active">正常</Radio>
                <Radio value="disabled">停用</Radio>
              </Radio.Group>
            </Form.Item>
          )}
        </Form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        title={`重置密码 - ${passwordUser?.name} (@${passwordUser?.username})`}
        visible={!!passwordUser}
        onOk={handleResetPassword}
        confirmLoading={passwordLoading}
        onCancel={() => {
          setPasswordUser(null);
          setNewPassword("");
        }}
        okText="确认重置"
        cancelText="取消"
        style={{ width: 460 }}
      >
        <div className="space-y-4">
          <Alert
            type="info"
            content="重置密码后，该用户下次需使用新密码登录。请妥善保存并通知该用户。"
          />
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              新密码
            </label>
            <Input.Password
              placeholder="请输入至少 6 位的新密码"
              value={newPassword}
              onChange={setNewPassword}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
