import { NextResponse } from "next/server";
import { findUserByUsername, updateUserLastLogin } from "@/lib/dataStore";
import { verifyPassword, signSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { toSafeUser } from "@/lib/authTypes";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body || {};

    if (!username || !password || typeof username !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { code: 400, message: "请输入用户名和密码" },
        { status: 400 }
      );
    }

    const user = await findUserByUsername(username.trim());
    if (!user) {
      return NextResponse.json(
        { code: 401, message: "用户名或密码错误" },
        { status: 401 }
      );
    }

    if (user.status === "disabled") {
      return NextResponse.json(
        { code: 403, message: "该账号已被停用，请联系管理员" },
        { status: 403 }
      );
    }

    const match = verifyPassword(password, user.passwordHash, user.salt);
    if (!match) {
      return NextResponse.json(
        { code: 401, message: "用户名或密码错误" },
        { status: 401 }
      );
    }

    await updateUserLastLogin(user.id);
    const token = await signSessionToken({
      uid: user.id,
      username: user.username,
      role: user.role,
    });

    const response = NextResponse.json({
      code: 0,
      message: "登录成功",
      data: toSafeUser(user),
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      // 仅在显式启用 HTTPS 时设置 Secure，否则纯 HTTP 部署下浏览器会丢弃该 Cookie
      secure: process.env.COOKIE_SECURE === "true",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { code: 500, message: error?.message || "登录请求处理失败" },
      { status: 500 }
    );
  }
}
