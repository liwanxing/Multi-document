import { notFound, redirect } from "next/navigation";
import { getStore } from "@/lib/dataStore";
import { productHref } from "@/lib/projectModel";
export const dynamic = "force-dynamic";
export default function LegacyProjectDocument({
  params,
}: {
  params: { projectSlug: string; docId: string };
}) {
  const store = getStore();
  const alias =
    store.legacyProjectAliases?.[params.projectSlug.replace(/-/g, "_")] ||
    store.legacyProjectAliases?.[params.projectSlug];
  const project = store.projects?.find(
    (p) => p.slug === params.projectSlug || p.id === alias?.projectId,
  );
  const doc = Object.values(store.docs).find(
    (d) => d.id === params.docId && d.status === "published",
  );
  const placement = doc?.placements?.find(
    (p) =>
      p.projectId === project?.id &&
      (!alias || p.productId === alias.productId),
  );
  const product = project?.products?.find((p) => p.id === placement?.productId);
  if (!project || !product || !doc) notFound();
  redirect(
    `${productHref(project, product)}/docs/${encodeURIComponent(doc.id)}`,
  );
}
