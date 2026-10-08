import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { resetUserPassword, findUserById } from "@/lib/dataStore";
import { hasUserPermission } from "@/lib/authTypes";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await request.json();
    const { id, newPassword } = body || {};

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { code: 400, message: "缺少目标用户 ID" },
        { status: 400 }
      );
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        { code: 400, message: "新密码长度至少需要 6 个字符" },
        { status: 400 }
      );
    }

    const targetUser = findUserById(id);
    if (!targetUser) {
      return NextResponse.json(
        { code: 404, message: "用户不存在" },
        { status: 404 }
      );
    }

    const canManage = hasUserPermission(auth.user, "users:manage");
    const isSelf = auth.user.id === id;

    if (!canManage && !isSelf) {
      return NextResponse.json(
        { code: 403, message: "无权修改其他用户的密码" },
        { status: 403 }
      );
    }

    resetUserPassword(id, newPassword);

    return NextResponse.json({
      code: 0,
      message: "密码已重置成功",
    });
  } catch (error: any) {
    return NextResponse.json(
      { code: 400, message: error?.message || "重置密码失败" },
      { status: 400 }
    );
  }
}
