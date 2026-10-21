import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { listRoles, createRole, updateRole, deleteRole, getStore } from "@/lib/dataStore";
import { Permission, ALL_PERMISSIONS } from "@/lib/authTypes";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePermission("users:manage", request);
  if (auth.errorResponse) return auth.errorResponse;

  const store = await getStore();
  const roles = await listRoles();
  const users = store.users || [];

  const rolesWithStats = roles.map((role) => ({
    ...role,
    userCount: users.filter((u) => u.role === role.id).length,
  }));

  return NextResponse.json({
    code: 0,
    data: rolesWithStats,
  });
}

export async function POST(request: Request) {
  const auth = await requirePermission("users:manage", request);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json();
    const { id, name, description, color, permissions } = body || {};

    if (!id || typeof id !== "string" || !/^[a-z0-9_-]{2,30}$/.test(id.trim().toLowerCase())) {
      return NextResponse.json(
        { code: 400, message: "角色标识须为 2~30 位的英文字母、数字或下划线" },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { code: 400, message: "角色名称至少需要 2 个字符" },
        { status: 400 }
      );
    }

    if (!Array.isArray(permissions)) {
      return NextResponse.json(
        { code: 400, message: "请为角色至少分配一项功能权限" },
        { status: 400 }
      );
    }

    // Filter valid permissions
    const validPermissions = (permissions as Permission[]).filter((p) =>
      ALL_PERMISSIONS.includes(p)
    );

    const created = await createRole({
      id: id.trim().toLowerCase(),
      name: name.trim(),
      description: description?.trim() || "",
      color: color?.trim() || "blue",
      permissions: validPermissions,
    });

    return NextResponse.json({
      code: 0,
      message: "创建角色成功",
      data: created,
    });
  } catch (error: any) {
    return NextResponse.json(
      { code: 400, message: error?.message || "创建角色失败" },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requirePermission("users:manage", request);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json();
    const { id, name, description, color, permissions } = body || {};

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { code: 400, message: "缺少角色 ID" },
        { status: 400 }
      );
    }

    let validPermissions: Permission[] | undefined = undefined;
    if (Array.isArray(permissions)) {
      validPermissions = (permissions as Permission[]).filter((p) =>
        ALL_PERMISSIONS.includes(p)
      );
    }

    const updated = await updateRole(id, {
      name,
      description,
      color,
      permissions: validPermissions,
    });

    return NextResponse.json({
      code: 0,
      message: "更新角色成功",
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { code: 400, message: error?.message || "更新角色失败" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requirePermission("users:manage", request);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id } = await request.json();
    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { code: 400, message: "缺少角色 ID" },
        { status: 400 }
      );
    }

    await deleteRole(id);

    return NextResponse.json({
      code: 0,
      message: "删除角色成功",
    });
  } catch (error: any) {
    return NextResponse.json(
      { code: 400, message: error?.message || "删除角色失败" },
      { status: 400 }
    );
  }
}
