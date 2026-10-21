import { visibleDocument, publicCatalog } from "@/lib/visibility";
import { notFound, redirect } from "next/navigation";
import { getStore } from "@/lib/dataStore";
import ProjectPortal from "@/components/ProjectPortal";
import { isBound, productHref } from "@/lib/projectModel";
export const dynamic = "force-dynamic";
export default async function ProjectPage({
  params,
}: {
  params: { projectSlug: string };
}) {
  const store = await getStore();
  const project = store.projects?.find((p) => p.slug === params.projectSlug);
  if (!project) {
    const alias =
      store.legacyProjectAliases?.[params.projectSlug.replace(/-/g, "_")] ||
      store.legacyProjectAliases?.[params.projectSlug];
    const migrated = store.projects?.find((p) => p.id === alias?.projectId);
    const product = migrated?.products?.find((p) => p.id === alias?.productId);
    if (migrated && product) redirect(productHref(migrated, product));
    notFound();
  }
  const documents = Object.values(store.docs)
    .filter((d) => visibleDocument(d, project))
    .map(({ id, title, description, placements }) => ({
      id,
      title,
      description,
      placements,
    }));
  return (
    <ProjectPortal project={publicCatalog(project)} documents={documents} />
  );
}
