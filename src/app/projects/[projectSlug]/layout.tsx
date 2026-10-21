import { getStore } from "@/lib/dataStore";
import ProjectHeader from "@/components/ProjectHeader";
export const dynamic = "force-dynamic";
export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { projectSlug: string };
}) {
  const project = (await getStore()).projects?.find(
    (p) => p.slug === params.projectSlug,
  );
  return (
    <>
      {project && <ProjectHeader project={project} />}
      <div className="project-public">{children}</div>
    </>
  );
}
