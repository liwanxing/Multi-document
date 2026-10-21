// Prisma 7 配置文件：加载 .env，并为 migrate 提供数据库连接适配器
import "dotenv/config";
import { defineConfig, env } from "prisma/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

export default defineConfig({
  schema: "prisma/schema.prisma",
  // migrate 需要显式声明连接串（Prisma 7 起不再从 schema 读 url）
  datasource: {
    url: env("DATABASE_URL"), // 惰性引用，由 CLI 在运行时解析
  },
  // 注意：Prisma 7.10 的运行时支持 migrate.adapter，但导出的 TS 类型尚未收录，
  // 用展开绕过 excess property 检查（CLI 实际行为已验证可用）
  ...({
    migrate: {
      // MySQL 与 MariaDB 协议兼容，Prisma 7 用同一适配器
      adapter: async (e: Record<string, string | undefined>) =>
        new PrismaMariaDb(e.DATABASE_URL as string),
    },
  } as Record<string, unknown>),
});
