# -*- coding: utf-8 -*-
"""把 seed/demo-seed.json（关系型导出格式）转换为 JSON 后端的 data/store.json（DocStoreData 格式）。"""
import json, os, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
seed = json.load(open(os.path.join(ROOT, "seed", "demo-seed.json"), encoding="utf-8"))

projects = []
for p in seed["projects"]:
    proj_products = [x for x in seed["products"] if x["projectId"] == p["id"]]
    products = []
    for prod in proj_products:
        cats = [
            {
                "id": c["id"],
                "name": c["name"],
                **({"icon": c["icon"]} if c.get("icon") else {}),
                **({"hidden": True} if c.get("hidden") else {}),
                "parentId": c.get("parentId"),
            }
            for c in seed["categories"]
            if c["productId"] in (prod["id"], prod["slug"])
        ]
        item = {
            "id": prod["id"],
            "slug": prod["slug"],
            "name": prod["name"],
            "description": prod.get("description") or "",
            "group": prod.get("group") or "产品与服务",
            "categories": cats,
        }
        if prod.get("media"):
            item["media"] = prod["media"]
        if prod.get("docOrder"):
            item["docOrder"] = prod["docOrder"]
        products.append(item)

    project = {
        "id": p["id"],
        "slug": p["slug"],
        "name": p["name"],
        "description": p.get("description") or "",
        "updatedAt": p.get("updatedAt") or p.get("createdAt"),
        "products": products,
    }
    for k in ("company", "brandName", "productGroups", "hiddenProductGroups", "groupIcons", "customFields"):
        if p.get(k):
            project[k] = p[k]
    projects.append(project)

placements_by_doc = collections.defaultdict(list)
for pl in seed["placements"]:
    placements_by_doc[pl["documentId"]].append(
        {
            "projectId": pl["projectId"],
            "productId": pl["productId"],
            "categoryId": pl.get("categoryId"),
        }
    )

docs, drafts = {}, {}
for doc in seed["documents"]:
    key = f"{doc['productId']}/{doc['slug']}"
    item = {
        "id": doc["id"],
        "productId": doc["productId"],
        "slug": doc["slug"],
        "title": doc["title"],
        "description": doc.get("description") or "",
        "breadcrumbs": doc.get("breadcrumbs") or [],
        "updatedAt": doc.get("updatedAt") or doc.get("createdAt"),
        "status": doc.get("status") or "published",
        "version": doc.get("version") or 1,
        "content": doc.get("content") or "",
    }
    if doc.get("hidden"):
        item["hidden"] = True
    if doc.get("changeNote"):
        item["changeNote"] = doc["changeNote"]
    if doc.get("appearance"):
        item["appearance"] = doc["appearance"]
    pls = placements_by_doc.get(doc["id"], [])
    if pls:
        item["placements"] = pls
        item["projectIds"] = sorted({x["projectId"] for x in pls})
    (drafts if item["status"] == "draft" else docs)[key] = item

history = []
for r in seed["revisions"]:
    history.append(
        {
            "id": r["id"],
            "docId": r["docId"],
            "version": r["version"],
            "title": r["title"],
            "publishedAt": r.get("publishedAt"),
            "summary": r.get("summary") or "",
            "changes": r.get("changes") or [],
            "placements": r.get("placements") or [],
            "content": r.get("content") or "",
            **({"appearance": r["appearance"]} if r.get("appearance") else {}),
            **({"baseline": True} if r.get("baseline") else {}),
            **({"publishedBy": r["publishedBy"]} if r.get("publishedBy") else {}),
        }
    )

aliases = {}
for p in seed["projects"]:
    for a in p.get("legacyAliases") or []:
        aliases[a["alias"]] = {"projectId": p["id"], "productId": a["productId"]}

store = {
    "schemaVersion": 2,
    "projects": projects,
    "docs": docs,
    "history": history,
    "categories": [],
    "legacyProjectAliases": aliases,
}

os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)
out = os.path.join(ROOT, "data", "store.json")
json.dump(store, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("written:", out)
print("projects:", len(projects), "docs:", len(docs), "drafts:", len(drafts), "history:", len(history))
