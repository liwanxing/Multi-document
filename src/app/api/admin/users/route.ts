import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { listUsers, createUser, updateUser, deleteUser, findUserById } from "@/lib/dataStore";
import { Role, Permission } from "@/lib/authTypes";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requirePermission("users:manage", request);
  if (auth.errorResponse) return auth.errorResponse;

  const users = listUsers();
  return NextResponse.json({
    code: 0,
    data: users,
  });
}

export async function POST(request: Request) {
  const auth = await requirePermission("users:manage", request);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json();
    const { username, name, role, password, customPermissions } = body || {};

    if (!username || typeof username !== "string" || username.trim().length < 2) {
      return NextResponse.json(
        { code: 400, message: "用户名至少需要 2 个字符" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { code: 400, message: "密码至少需要 6 个字符" },
        { status: 400 }
      );
    }

    const validRoles: Role[] = ["admin", "editor", "viewer"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { code: 400, message: "无效的角色类型" },
        { status: 400 }
      );
    }

    const user = createUser({
      username: username.trim(),
      name: name?.trim() || username.trim(),
      role,
      password,
      customPermissions: Array.isArray(customPermissions) ? (customPermissions as Permission[]) : undefined,
    });

    return NextResponse.json({
      code: 0,
      message: "创建用户成功",
      data: user,
    });
  } catch (error: any) {
    return NextResponse.json(
      { code: 400, message: error?.message || "创建用户失败" },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requirePermission("users:manage", request);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json();
    const { id, name, role, status, customPermissions } = body || {};

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { code: 400, message: "缺少用户 ID" },
        { status: 400 }
      );
    }

    const targetUser = findUserById(id);
    if (!targetUser) {
      return NextResponse.json(
        { code: 404, message: "目标用户不存在" },
        { status: 404 }
      );
    }

    // Safety checks for self-editing
    if (auth.user.id === id) {
      if (status === "disabled") {
        return NextResponse.json(
          { code: 400, message: "不能停用当前登录的管理员账号" },
          { status: 400 }
        );
      }
      if (role && role !== "admin") {
        return NextResponse.json(
          { code: 400, message: "不能降级当前登录的管理员角色" },
          { status: 400 }
        );
      }
    }

    const updated = updateUser(id, {
      name,
      role,
      status,
      customPermissions: Array.isArray(customPermissions) ? (customPermissions as Permission[]) : undefined,
    });

    return NextResponse.json({
      code: 0,
      message: "更新用户成功",
      data: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { code: 400, message: error?.message || "更新用户失败" },
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
        { code: 400, message: "缺少用户 ID" },
        { status: 400 }
      );
    }

    if (auth.user.id === id) {
      return NextResponse.json(
        { code: 400, message: "不能删除当前登录的管理员账号" },
        { status: 400 }
      );
    }

    deleteUser(id);
    return NextResponse.json({
      code: 0,
      message: "删除用户成功",
    });
  } catch (error: any) {
    return NextResponse.json(
      { code: 400, message: error?.message || "删除用户失败" },
      { status: 400 }
    );
  }
}
