/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Docker 部署：产出自包含的 standalone 服务（node server.js 即可运行，无需完整 node_modules）
  output: "standalone",
};

module.exports = nextConfig;
