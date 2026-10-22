import type { Metadata } from "next";
import "@arco-design/web-react/dist/css/arco.css";
import "./globals.css";
import "./document-portal.css";
import "./document-reference.css";
import "./document-dark.css";
import Header from "@/components/Header";
import ClientConfigProvider from "@/components/ClientConfigProvider";
import { getAuthenticatedUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "中广云 - 文档中心",
  description:
    "提供中广云全量云计算、大模型与AI算法、音视频、网络与安全产品技术文档与开发指南。",
};

/**
 * 首帧前套用外观模式，避免亮/暗闪烁。
 * - <html data-theme="dark"> 触发 document-dark.css
 * - <body arco-theme="dark"> 触发 Arco Design 自带暗色变量
 * - 后台（/admin）暂不参与，固定亮色
 */
const themeInitScript = `(function(){try{
var m=localStorage.getItem("volc-doc-theme-mode");
if(m!=="light"&&m!=="dark")m="system";
var d=m==="system"?(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):m;
if(location.pathname==="/admin"||location.pathname.indexOf("/admin/")===0)d="light";
var r=document.documentElement;
r.setAttribute("data-theme-mode",m);
r.setAttribute("data-theme",d);
r.style.colorScheme=d;
if(document.body)document.body.setAttribute("arco-theme",d==="dark"?"dark":"light");
}catch(e){}})();`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 站点级顶栏的"管理后台"入口仅对已登录的后管用户渲染（访客不可见）
  const adminUser = await getAuthenticatedUser();
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body suppressHydrationWarning className="min-h-screen bg-white text-gray-900 flex flex-col antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#1664FF] focus:text-white focus:rounded-lg focus:shadow-md focus:text-xs focus:font-medium"
        >
          跳至主要内容
        </a>
        <ClientConfigProvider>
          <Header showAdmin={!!adminUser} />
          <main id="main-content" className="flex-1 flex flex-col">{children}</main>
        </ClientConfigProvider>
      </body>
    </html>
  );
}
