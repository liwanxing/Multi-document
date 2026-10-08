import { visibleDocument, publicCatalog } from "./visibility";
import { notFound } from "next/navigation";
import { getStore } from "./dataStore";
import { isBound, sortDocsByCatalog, visibleHistory } from "./projectModel";
export function publicProduct(projectSlug: string, productSlug: string) {
  const store = getStore();
  const project = store.projects?.find((p) => p.slug === projectSlug);
  const product =
    project &&
    publicCatalog(project).products?.find((p) => p.slug === productSlug);
  if (!project || !product) notFound();
  const documents = sortDocsByCatalog(
    Object.values(store.docs).filter((d) =>
      visibleDocument(d, project, product.id),
    ),
    product,
  );
  return {
    project,
    product: publicCatalog(project).products!.find((p) => p.id === product.id)!,
    documents,
    history: visibleHistory(
      store.history || [],
      documents,
      project.id,
      product.id,
    ),
  };
}
