# 生成迁移 SQL：全部列加 COMMENT + projects 新增 customFields
# 列定义从 information_schema 读取，保证 MODIFY 后类型不变
import re, subprocess

DB = "multi_document"

COMMENTS = {
 "projects": {
  "id": "项目唯一标识（原项目沿用slug风格，新项目用UUID）",
  "slug": "项目链接标识，URL用，全库唯一，创建后不可改",
  "name": "项目名称，页面标题与卡片显示",
  "description": "项目简介，项目卡片上展示",
  "company": "公司名，变量{{company_name}}的取值",
  "brandName": "品牌名，变量{{brand_name}}的取值",
  "productGroups": "产品分组排序（Json数组）",
  "hiddenProductGroups": "隐藏的产品分组（Json数组）",
  "groupIcons": "分组图标配置（Json对象）",
  "legacyAliases": "旧链接跳转别名[{alias,productId}]（Json）",
  "customFields": "项目自定义字段/变量[{key,label,value}]，文档可用{{key}}引用（Json）",
  "createdAt": "创建时间",
  "updatedAt": "更新时间",
 },
 "products": {
  "id": "产品唯一标识（原产品沿用slug风格，复制的为UUID）",
  "projectId": "所属项目（外键→projects.id）",
  "slug": "产品链接标识，URL用，项目内唯一",
  "name": "产品名称",
  "description": "产品简介，产品卡片展示",
  "group": "所属产品分组（首页分组标签）",
  "media": "产品头图/视频{url,type}（Json，可空）",
  "docOrder": "目录内文档排序（Json数组，可空）",
  "createdAt": "创建时间",
  "updatedAt": "更新时间",
 },
 "doc_categories": {
  "id": "分类唯一标识",
  "productId": "所属产品（外键→products.id）",
  "name": "分类名称",
  "icon": "分类图标（可空）",
  "hidden": "是否隐藏",
  "parentId": "父分类id（自引用，树形结构，可空）",
 },
 "doc_tree_nodes": {
  "id": "节点唯一标识（doc节点id与文档id一致）",
  "productId": "所属产品（逻辑引用，无FK）",
  "parentId": "父节点id（自引用，可空）",
  "title": "目录显示名",
  "slug": "链接标识",
  "type": "节点类型：folder文件夹/doc文档",
  "status": "发布状态published/draft（仅doc节点，可空）",
  "order": "同级排序（原数组顺序）",
 },
 "documents": {
  "id": "文档唯一标识（即文档slug）",
  "productId": "归属产品（外键→products.id，正文存放的产品库）",
  "slug": "文档链接标识",
  "title": "文档标题",
  "description": "文档摘要",
  "content": "正文Markdown源（可写{{brand_name}}等变量）",
  "status": "状态：published已发布/draft草稿，同一文档两种状态各一行",
  "version": "当前版本号",
  "breadcrumbs": "面包屑路径（Json数组）",
  "hidden": "是否隐藏",
  "changeNote": "变更说明（发布时写入历史后清空）",
  "appearance": "外观排版配置（Json，可空）",
  "createdAt": "创建时间",
  "updatedAt": "更新时间",
 },
 "doc_placements": {
  "id": "挂载行标识，格式：文档id:项目id:产品id:分类id",
  "documentId": "挂载的文档（外键→documents.id，级联删除）",
  "projectId": "挂载到的项目（逻辑引用，无FK）",
  "productId": "挂载到的产品（逻辑引用，无FK）",
  "categoryId": "挂载到的分类（逻辑引用，可空）",
 },
 "doc_revisions": {
  "id": "版本快照唯一标识",
  "docId": "所属文档（外键→documents.id，级联删除）",
  "version": "版本号，只增不更",
  "title": "发布时标题快照",
  "summary": "变更摘要（优先用发布说明，否则自动生成）",
  "changes": "变更项列表（Json数组，如[标题,正文]）",
  "placements": "发布时挂载点快照（Json）",
  "content": "发布时正文快照",
  "appearance": "发布时外观配置快照（Json，可空）",
  "baseline": "是否基线版本（旧系统迁移的首个版本）",
  "publishedAt": "发布时间",
 },
 "app_settings": {
  "key": "配置键（主键）",
  "value": "配置值（Json）",
  "updatedAt": "更新时间",
 },
 "roles": {
  "id": "角色唯一标识",
  "name": "角色名",
  "description": "角色描述",
  "color": "角色颜色标识",
  "permissions": "权限列表（Json数组，8种权限枚举见authTypes.ts）",
  "isSystem": "是否内置角色（内置不可删）",
  "createdAt": "创建时间",
  "updatedAt": "更新时间",
 },
 "users": {
  "id": "用户唯一标识",
  "username": "登录名，唯一",
  "name": "显示名",
  "passwordHash": "密码哈希",
  "salt": "密码盐",
  "roleId": "所属角色（外键→roles.id）",
  "status": "状态：active启用/disabled停用",
  "customPermissions": "用户级权限覆盖（Json，可空）",
  "lastLoginAt": "最后登录时间（可空）",
  "createdAt": "创建时间",
  "updatedAt": "更新时间",
 },
}

def q(sql):
    r = subprocess.run(["docker","exec","multi-doc-mysql","mysql","-uroot","-pmultidoc123","--default-character-set=utf8mb4","-N","-B","-e",sql,DB],capture_output=True,text=True)
    return r.stdout

lines = []
# 1) 新列
lines.append("ALTER TABLE `projects` ADD COLUMN `customFields` JSON NULL COMMENT '项目自定义字段/变量[{key,label,value}]，文档可用{{key}}引用（Json）' AFTER `legacyAliases`;")

# 2) 每表 MODIFY 加 COMMENT
for table, cols in COMMENTS.items():
    defs = {}
    out = q(f"""SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
      FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='{DB}' AND TABLE_NAME='{table}'""")
    for row in out.strip().splitlines():
        parts = row.split("\t")
        parts += [""] * (5 - len(parts))
        name, ctype, nullable, dflt, extra = parts[:5]
        if dflt == "":
            dflt = None
        d = ctype
        d += " NULL" if nullable=="YES" else " NOT NULL"
        if dflt is not None and dflt != "NULL":
            if re.fullmatch(r"-?\d+(\.\d+)?", dflt):
                d += f" DEFAULT {dflt}"
            elif dflt.upper().startswith("CURRENT_TIMESTAMP"):
                d += " DEFAULT CURRENT_TIMESTAMP(3)"  # 表达式默认值不能加引号
            else:
                d += f" DEFAULT '{dflt}'"
        if extra and "on update" in extra.lower():
            m = re.search(r"on update\s+CURRENT_TIMESTAMP(?:\(\d+\))?", extra, re.I)
            if m:
                d += f" {m.group(0)}"
        defs[name] = d
    mods = []
    for col, comment in cols.items():
        if col == "customFields" and table == "projects":
            continue  # 新增列已带注释
        if col not in defs:
            raise SystemExit(f"列不存在: {table}.{col}")
        mods.append(f"MODIFY COLUMN `{col}` {defs[col]} COMMENT '{comment}'")
    lines.append(f"ALTER TABLE `{table}`\n  " + ",\n  ".join(mods) + ";")

print("\n\n".join(lines))
