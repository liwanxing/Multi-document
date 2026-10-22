import { getStore } from "@/lib/dataStore";
import { getAuthenticatedUser } from "@/lib/auth";
import ProjectHeader from "@/components/ProjectHeader";
export const dynamic = "force-dynamic";
export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { projectSlug: string };
}) {
  const [project, adminUser] = await Promise.all([
    getStore().then((s) =>
      s.projects?.find((p) => p.slug === params.projectSlug),
    ),
    // 仅已登录的后管用户才渲染"管理后台"入口（未登录访客不可见）
    getAuthenticatedUser(),
  ]);
  return (
    <>
      {project && <ProjectHeader project={project} showAdmin={!!adminUser} />}
      <div className="project-public">{children}</div>
    </>
  );
}
