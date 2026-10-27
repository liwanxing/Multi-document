/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Docker 部署：产出自包含的 standalone 服务（node server.js 即可运行，无需完整 node_modules）
  output: "standalone",
  experimental: {
    // 开发模式不做 tree-shaking，从 barrel 包具名导入会把整库塞进浏览器。
    // lucide-react 等已在 Next 默认列表里，arco 需要显式声明才能按组件粒度引入。
    optimizePackageImports: ["@arco-design/web-react"],
  },
};

module.exports = nextConfig;
