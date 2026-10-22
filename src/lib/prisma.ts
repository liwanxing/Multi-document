// Prisma Client 单例（Prisma 7：必须经驱动适配器连接，不能只用连接串）
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL 未配置（.env 中应有 mysql://... 连接串）");
  // MySQL 8 caching_sha2_password：容器重启后认证缓存清空，
  // 首次 TCP 连接需要 RSA 公钥，必须显式允许，否则报 45028 连接池取不到连接
  const u = new URL(url);
  return new PrismaClient({
    adapter: new PrismaMariaDb({
      host: u.hostname,
      port: Number(u.port || 3306),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database: u.pathname.replace(/^\//, ""),
      allowPublicKeyRetrieval: true,
      connectionLimit: 10,
    }),
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
