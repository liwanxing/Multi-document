ALTER TABLE `projects` ADD COLUMN `customFields` JSON NULL COMMENT '项目自定义字段/变量[{key,label,value}]，文档可用{{key}}引用（Json）' AFTER `legacyAliases`;

ALTER TABLE `projects`
  MODIFY COLUMN `id` varchar(191) NOT NULL COMMENT '项目唯一标识（原项目沿用slug风格，新项目用UUID）',
  MODIFY COLUMN `slug` varchar(191) NOT NULL COMMENT '项目链接标识，URL用，全库唯一，创建后不可改',
  MODIFY COLUMN `name` varchar(191) NOT NULL COMMENT '项目名称，页面标题与卡片显示',
  MODIFY COLUMN `description` text NOT NULL COMMENT '项目简介，项目卡片上展示',
  MODIFY COLUMN `company` varchar(191) NULL COMMENT '公司名，变量{{company_name}}的取值',
  MODIFY COLUMN `brandName` varchar(191) NULL COMMENT '品牌名，变量{{brand_name}}的取值',
  MODIFY COLUMN `productGroups` json NULL COMMENT '产品分组排序（Json数组）',
  MODIFY COLUMN `hiddenProductGroups` json NULL COMMENT '隐藏的产品分组（Json数组）',
  MODIFY COLUMN `groupIcons` json NULL COMMENT '分组图标配置（Json对象）',
  MODIFY COLUMN `legacyAliases` json NULL COMMENT '旧链接跳转别名[{alias,productId}]（Json）',
  MODIFY COLUMN `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  MODIFY COLUMN `updatedAt` datetime(3) NOT NULL COMMENT '更新时间';

ALTER TABLE `products`
  MODIFY COLUMN `id` varchar(191) NOT NULL COMMENT '产品唯一标识（原产品沿用slug风格，复制的为UUID）',
  MODIFY COLUMN `projectId` varchar(191) NOT NULL COMMENT '所属项目（外键→projects.id）',
  MODIFY COLUMN `slug` varchar(191) NOT NULL COMMENT '产品链接标识，URL用，项目内唯一',
  MODIFY COLUMN `name` varchar(191) NOT NULL COMMENT '产品名称',
  MODIFY COLUMN `description` text NOT NULL COMMENT '产品简介，产品卡片展示',
  MODIFY COLUMN `group` varchar(191) NOT NULL COMMENT '所属产品分组（首页分组标签）',
  MODIFY COLUMN `media` json NULL COMMENT '产品头图/视频{url,type}（Json，可空）',
  MODIFY COLUMN `docOrder` json NULL COMMENT '目录内文档排序（Json数组，可空）',
  MODIFY COLUMN `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  MODIFY COLUMN `updatedAt` datetime(3) NOT NULL COMMENT '更新时间';

ALTER TABLE `doc_categories`
  MODIFY COLUMN `id` varchar(191) NOT NULL COMMENT '分类唯一标识',
  MODIFY COLUMN `productId` varchar(191) NOT NULL COMMENT '所属产品（外键→products.id）',
  MODIFY COLUMN `name` varchar(191) NOT NULL COMMENT '分类名称',
  MODIFY COLUMN `icon` varchar(191) NULL COMMENT '分类图标（可空）',
  MODIFY COLUMN `hidden` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否隐藏',
  MODIFY COLUMN `parentId` varchar(191) NULL COMMENT '父分类id（自引用，树形结构，可空）';

ALTER TABLE `doc_tree_nodes`
  MODIFY COLUMN `id` varchar(191) NOT NULL COMMENT '节点唯一标识（doc节点id与文档id一致）',
  MODIFY COLUMN `productId` varchar(191) NOT NULL COMMENT '所属产品（逻辑引用，无FK）',
  MODIFY COLUMN `parentId` varchar(191) NULL COMMENT '父节点id（自引用，可空）',
  MODIFY COLUMN `title` varchar(191) NOT NULL COMMENT '目录显示名',
  MODIFY COLUMN `slug` varchar(191) NOT NULL COMMENT '链接标识',
  MODIFY COLUMN `type` varchar(191) NOT NULL COMMENT '节点类型：folder文件夹/doc文档',
  MODIFY COLUMN `status` varchar(191) NULL COMMENT '发布状态published/draft（仅doc节点，可空）',
  MODIFY COLUMN `order` int NOT NULL DEFAULT 0 COMMENT '同级排序（原数组顺序）';

ALTER TABLE `documents`
  MODIFY COLUMN `id` varchar(191) NOT NULL COMMENT '文档唯一标识（即文档slug）',
  MODIFY COLUMN `productId` varchar(191) NOT NULL COMMENT '归属产品（外键→products.id，正文存放的产品库）',
  MODIFY COLUMN `slug` varchar(191) NOT NULL COMMENT '文档链接标识',
  MODIFY COLUMN `title` varchar(191) NOT NULL COMMENT '文档标题',
  MODIFY COLUMN `description` text NULL COMMENT '文档摘要',
  MODIFY COLUMN `content` longtext NOT NULL COMMENT '正文Markdown源（可写{{brand_name}}等变量）',
  MODIFY COLUMN `status` varchar(191) NOT NULL DEFAULT 'draft' COMMENT '状态：published已发布/draft草稿，同一文档两种状态各一行',
  MODIFY COLUMN `version` int NOT NULL DEFAULT 1 COMMENT '当前版本号',
  MODIFY COLUMN `breadcrumbs` json NULL COMMENT '面包屑路径（Json数组）',
  MODIFY COLUMN `hidden` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否隐藏',
  MODIFY COLUMN `changeNote` text NULL COMMENT '变更说明（发布时写入历史后清空）',
  MODIFY COLUMN `appearance` json NULL COMMENT '外观排版配置（Json，可空）',
  MODIFY COLUMN `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  MODIFY COLUMN `updatedAt` datetime(3) NOT NULL COMMENT '更新时间';

ALTER TABLE `doc_placements`
  MODIFY COLUMN `id` varchar(191) NOT NULL COMMENT '挂载行标识，格式：文档id:项目id:产品id:分类id',
  MODIFY COLUMN `documentId` varchar(191) NOT NULL COMMENT '挂载的文档（外键→documents.id，级联删除）',
  MODIFY COLUMN `projectId` varchar(191) NOT NULL COMMENT '挂载到的项目（逻辑引用，无FK）',
  MODIFY COLUMN `productId` varchar(191) NOT NULL COMMENT '挂载到的产品（逻辑引用，无FK）',
  MODIFY COLUMN `categoryId` varchar(191) NULL COMMENT '挂载到的分类（逻辑引用，可空）';

ALTER TABLE `doc_revisions`
  MODIFY COLUMN `id` varchar(191) NOT NULL COMMENT '版本快照唯一标识',
  MODIFY COLUMN `docId` varchar(191) NOT NULL COMMENT '所属文档（外键→documents.id，级联删除）',
  MODIFY COLUMN `version` int NOT NULL COMMENT '版本号，只增不更',
  MODIFY COLUMN `title` varchar(191) NOT NULL COMMENT '发布时标题快照',
  MODIFY COLUMN `summary` text NOT NULL COMMENT '变更摘要（优先用发布说明，否则自动生成）',
  MODIFY COLUMN `changes` json NOT NULL COMMENT '变更项列表（Json数组，如[标题,正文]）',
  MODIFY COLUMN `placements` json NOT NULL COMMENT '发布时挂载点快照（Json）',
  MODIFY COLUMN `content` longtext NOT NULL COMMENT '发布时正文快照',
  MODIFY COLUMN `appearance` json NULL COMMENT '发布时外观配置快照（Json，可空）',
  MODIFY COLUMN `baseline` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否基线版本（旧系统迁移的首个版本）',
  MODIFY COLUMN `publishedAt` datetime(3) NOT NULL COMMENT '发布时间';

ALTER TABLE `app_settings`
  MODIFY COLUMN `key` varchar(191) NOT NULL COMMENT '配置键（主键）',
  MODIFY COLUMN `value` json NOT NULL COMMENT '配置值（Json）',
  MODIFY COLUMN `updatedAt` datetime(3) NOT NULL COMMENT '更新时间';

ALTER TABLE `roles`
  MODIFY COLUMN `id` varchar(191) NOT NULL COMMENT '角色唯一标识',
  MODIFY COLUMN `name` varchar(191) NOT NULL COMMENT '角色名',
  MODIFY COLUMN `description` text NULL COMMENT '角色描述',
  MODIFY COLUMN `color` varchar(191) NULL COMMENT '角色颜色标识',
  MODIFY COLUMN `permissions` json NOT NULL COMMENT '权限列表（Json数组，8种权限枚举见authTypes.ts）',
  MODIFY COLUMN `isSystem` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否内置角色（内置不可删）',
  MODIFY COLUMN `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  MODIFY COLUMN `updatedAt` datetime(3) NOT NULL COMMENT '更新时间';

ALTER TABLE `users`
  MODIFY COLUMN `id` varchar(191) NOT NULL COMMENT '用户唯一标识',
  MODIFY COLUMN `username` varchar(191) NOT NULL COMMENT '登录名，唯一',
  MODIFY COLUMN `name` varchar(191) NOT NULL COMMENT '显示名',
  MODIFY COLUMN `passwordHash` varchar(191) NOT NULL COMMENT '密码哈希',
  MODIFY COLUMN `salt` varchar(191) NOT NULL COMMENT '密码盐',
  MODIFY COLUMN `roleId` varchar(191) NOT NULL COMMENT '所属角色（外键→roles.id）',
  MODIFY COLUMN `status` varchar(191) NOT NULL DEFAULT 'active' COMMENT '状态：active启用/disabled停用',
  MODIFY COLUMN `customPermissions` json NULL COMMENT '用户级权限覆盖（Json，可空）',
  MODIFY COLUMN `lastLoginAt` datetime(3) NULL COMMENT '最后登录时间（可空）',
  MODIFY COLUMN `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  MODIFY COLUMN `updatedAt` datetime(3) NOT NULL COMMENT '更新时间';
