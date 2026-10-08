export type Role = "admin" | "editor" | "viewer" | string;

export type Permission =
  | "projects:view"
  | "projects:edit"
  | "projects:delete"
  | "docs:view"
  | "docs:edit"
  | "docs:publish"
  | "docs:delete"
  | "users:manage";

export interface RoleDefinition {
  id: string; // 唯一标识，例如 "admin", "editor", "viewer", "reviewer"
  name: string; // 显示名称，例如 "超级管理员", "运营专员", "审核人员"
  description: string;
  color: string; // 颜色标识，如 "purple" | "blue" | "green" | "orange" | "cyan" | "magenta" | "gray"
  permissions: Permission[];
  isSystem?: boolean; // 是否系统预设角色
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  id: string;
  username: string;
  name: string;
  role: Role;
  customPermissions?: Permission[];
  passwordHash: string;
  salt: string;
  status: "active" | "disabled";
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
}

export type SafeAdminUser = Omit<AdminUser, "passwordHash" | "salt"> & {
  permissions: Permission[];
  roleName?: string;
  roleColor?: string;
};

export interface PermissionItem {
  key: Permission;
  label: string;
  description: string;
}

export interface PermissionGroup {
  groupKey: string;
  groupTitle: string;
  permissions: PermissionItem[];
}

export const ALL_PERMISSIONS: Permission[] = [
  "projects:view",
  "projects:edit",
  "projects:delete",
  "docs:view",
  "docs:edit",
  "docs:publish",
  "docs:delete",
  "users:manage",
];

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    groupKey: "projects",
    groupTitle: "项目管理",
    permissions: [
      {
        key: "projects:view",
        label: "查看项目",
        description: "浏览项目列表、查看产品与目录架构",
      },
      {
        key: "projects:edit",
        label: "创建与编辑项目",
        description: "新建项目、复制项目、修改项目配置与目录架构",
      },
      {
        key: "projects:delete",
        label: "删除项目",
        description: "彻底删除项目及其专属绑定（高危权限）",
      },
    ],
  },
  {
    groupKey: "docs",
    groupTitle: "文档中心",
    permissions: [
      {
        key: "docs:view",
        label: "浏览文档",
        description: "查看文档列表、检索与预览文档正文",
      },
      {
        key: "docs:edit",
        label: "编写与编辑",
        description: "创建文档、编写 Markdown 正文、保存草稿与调整组件样式",
      },
      {
        key: "docs:publish",
        label: "发布文档",
        description: "审核并正式发布文档版本，控制文档上架与下架状态",
      },
      {
        key: "docs:delete",
        label: "删除文档",
        description: "删除文档草稿、正式文档及历史版本记录",
      },
    ],
  },
  {
    groupKey: "system",
    groupTitle: "系统管理",
    permissions: [
      {
        key: "users:manage",
        label: "用户与角色权限管理",
        description: "管理后台用户账号、配置与分配系统角色、设定功能权限",
      },
    ],
  },
];

export const ROLE_LABELS: Record<string, { label: string; description: string; color: string }> = {
  admin: {
    label: "超级管理员",
    description: "拥有系统全量控制权限，包括项目、文档与用户权限配置",
    color: "purple",
  },
  editor: {
    label: "运营人员",
    description: "拥有文档编写、维护、版本发布与目录配置权限，不可管理用户",
    color: "blue",
  },
  viewer: {
    label: "只读成员",
    description: "仅可浏览项目与文档，不可修改、保存或发布",
    color: "gray",
  },
};

export const ROLE_DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  admin: [
    "projects:view",
    "projects:edit",
    "projects:delete",
    "docs:view",
    "docs:edit",
    "docs:publish",
    "docs:delete",
    "users:manage",
  ],
  editor: [
    "projects:view",
    "projects:edit",
    "docs:view",
    "docs:edit",
    "docs:publish",
    "docs:delete",
  ],
  viewer: ["projects:view", "docs:view"],
};

export function getUserPermissions(
  user: Pick<AdminUser, "role" | "customPermissions">,
  roles?: RoleDefinition[]
): Permission[] {
  if (user.role === "admin") {
    return [...ALL_PERMISSIONS];
  }

  let basePermissions: Permission[] = [];
  if (roles && roles.length > 0) {
    const found = roles.find((r) => r.id === user.role);
    if (found) {
      basePermissions = found.permissions;
    } else {
      basePermissions = ROLE_DEFAULT_PERMISSIONS[user.role] || [];
    }
  } else {
    basePermissions = ROLE_DEFAULT_PERMISSIONS[user.role] || [];
  }

  if (user.customPermissions && user.customPermissions.length > 0) {
    return Array.from(new Set([...basePermissions, ...user.customPermissions]));
  }
  return basePermissions;
}

export function hasUserPermission(
  user: Pick<AdminUser, "role" | "customPermissions"> | null | undefined,
  required: Permission,
  roles?: RoleDefinition[]
): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  const permissions = getUserPermissions(user, roles);
  return permissions.includes(required);
}

export function toSafeUser(user: AdminUser, roles?: RoleDefinition[]): SafeAdminUser {
  const roleDef = roles?.find((r) => r.id === user.role);
  const staticLabel = ROLE_LABELS[user.role];
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    customPermissions: user.customPermissions,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt,
    permissions: getUserPermissions(user, roles),
    roleName: roleDef?.name || staticLabel?.label || user.role,
    roleColor: roleDef?.color || staticLabel?.color || "gray",
  };
}
