import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { code: 401, message: "未登录或登录已过期" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    code: 0,
    data: user,
  });
}
