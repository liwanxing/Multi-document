import { cookies } from "next/headers";
import { Permission, SafeAdminUser, hasUserPermission, toSafeUser } from "./authTypes";
import {
  SESSION_COOKIE_NAME,
  signSessionToken,
  verifySessionToken,
  hashPassword,
  verifyPassword,
} from "./authCrypto";
import { getStore } from "./dataStore";

export {
  SESSION_COOKIE_NAME,
  signSessionToken,
  verifySessionToken,
  hashPassword,
  verifyPassword,
};

export function extractCookieToken(req?: Request): string | null {
  if (req) {
    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
    if (match) return decodeURIComponent(match[1]);
  }

  try {
    const cookieStore = cookies();
    return cookieStore.get(SESSION_COOKIE_NAME)?.value || null;
  } catch {
    return null;
  }
}

export async function getAuthenticatedUser(req?: Request): Promise<SafeAdminUser | null> {
  const token = extractCookieToken(req);
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload || !payload.uid) return null;

  try {
    const store = await getStore();
    const user = store.users?.find((u) => u.id === payload.uid);
    if (!user || user.status === "disabled") {
      return null;
    }
    return toSafeUser(user, store.roles);
  } catch {
    return null;
  }
}

export async function requireAuth(req?: Request): Promise<
  | { user: SafeAdminUser; errorResponse: null }
  | { user: null; errorResponse: Response }
> {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return {
      user: null,
      errorResponse: Response.json(
        { code: 401, message: "未登录或登录状态已过期，请重新登录" },
        { status: 401 }
      ),
    };
  }
  return { user, errorResponse: null };
}

export async function requirePermission(
  permission: Permission,
  req?: Request
): Promise<
  | { user: SafeAdminUser; errorResponse: null }
  | { user: null; errorResponse: Response }
> {
  const auth = await requireAuth(req);
  if (auth.errorResponse) return auth;

  const store = await getStore();
  if (!hasUserPermission(auth.user, permission, store.roles)) {
    return {
      user: null,
      errorResponse: Response.json(
        { code: 403, message: "无权执行此操作，请联系超级管理员配置权限" },
        { status: 403 }
      ),
    };
  }

  return auth;
}
