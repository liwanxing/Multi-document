import { randomUUID } from "crypto";
import type { DocStoreData, Project, DocPlacement } from "./dataStore";
export function cloneProject(
  store: DocStoreData,
  source: Project,
  input: { name: string; description: string; slug: string;company?:string;brandName?:string },
) {
  const copy: Project = JSON.parse(JSON.stringify(source));
  copy.id = randomUUID();
  copy.name = input.name;
  if(input.company!==undefined)copy.company=input.company;
  if(input.brandName!==undefined)copy.brandName=input.brandName;
  copy.description = input.description;
  copy.slug = input.slug;
  copy.updatedAt = new Date().toISOString();
  const products = new Map<string, string>(),
    categories = new Map<string, string>(),
    docs = new Map<string, { id: string; slug: string }>();
  copy.products?.forEach((p) => {
    const old = p.id;
    p.id = randomUUID();
    products.set(old, p.id);
    p.categories.forEach((c) => categories.set(c.id, randomUUID()));
    p.categories = p.categories.map((c) => ({
      ...c,
      id: categories.get(c.id)!,
      parentId: c.parentId ? categories.get(c.parentId)! : null,
    }));
  });
  const placements = (items: DocPlacement[] | undefined) =>
    items
      ?.filter((p) => p.projectId === source.id)
      .map((p) => ({
        ...p,
        projectId: copy.id,
        productId: products.get(p.productId)!,
        categoryId: p.categoryId ? categories.get(p.categoryId)! : null,
      }))
      .filter((p) => p.productId) || [];
  for (const collection of [store.docs, store.drafts || {}])
    for (const doc of Object.values(collection)) {
      if (!placements(doc.placements).length) continue;
      if (!docs.has(doc.id))
        docs.set(doc.id, { id: randomUUID(), slug: `copy-${randomUUID()}` });
    }
  const rewrite = (text: string) => {
    const prefix = `/projects/${source.slug}/`;
    return text.replace(/\/projects\/[^\s"'<>)]*/g, path => {
      if(!path.startsWith(prefix))return path;
      const replaced=path.replace(/(\/docs\/)([^/?#]+)/, (match,segment,id)=>{try{const target=docs.get(decodeURIComponent(id));return target?segment+target.id:match;}catch{return match;}});
      return `/projects/${copy.slug}/`+replaced.slice(prefix.length);
    });
  };
  for (const collection of [store.docs, store.drafts || {}])
    for (const doc of Object.values(collection)) {
      const binding = placements(doc.placements);
      if (!binding.length) continue;
      const target = docs.get(doc.id)!;
      const cloned = JSON.parse(JSON.stringify(doc));
      Object.assign(cloned, target, {
        productId: "library",
        placements: binding,
        projectIds: [copy.id],
        content: rewrite(doc.content),
      });
      collection[`library/${target.slug}`] = cloned;
    }
  copy.products?.forEach((p) => {
    if (p.docOrder)
      p.docOrder = p.docOrder
        .map((id) => docs.get(id)?.id)
        .filter((id): id is string => !!id);
  });
  store.history = [
    ...(store.history || []),
    ...(store.history || [])
      .filter((r) => docs.has(r.docId) && placements(r.placements).length)
      .map((r) => ({
        ...r,
        id: randomUUID(),
        docId: docs.get(r.docId)!.id,
        placements: placements(r.placements),
        content: rewrite(r.content),
      })),
  ];
  store.projects = [...(store.projects || []), copy];
  return copy;
}
