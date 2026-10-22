-- 本迁移做四件事：
-- 1. doc_revisions 加 createdBy（发布人留痕）
-- 2. 状态列收敛为 MySQL 枚举（DB 层拒绝非法值）
-- 3. doc_placements 补齐三个锚点外键（原先只有 documentId 有外键，孤儿挂载点不设防）
-- 4. 原有三条 RESTRICT 外键换成 CASCADE（删项目/产品能一路级联下去，
--    RESTRICT 时删带子行的项目/产品会直接报 FK 错误）

-- 1. 发布人留痕（历史行允许为空）
ALTER TABLE `doc_revisions` ADD COLUMN `createdBy` varchar(191) NULL COMMENT '发布人（用户名），留痕审计用；迁移基线等历史行可为空' AFTER `baseline`;

-- 2. 状态列改枚举（现有数据取值已被应用层约束在这些值内，转换安全）
ALTER TABLE `documents`
  MODIFY COLUMN `status` ENUM('draft', 'published') NOT NULL DEFAULT 'draft' COMMENT '状态：published已发布/draft草稿，同一文档两种状态各一行';
ALTER TABLE `doc_tree_nodes`
  MODIFY COLUMN `type` ENUM('folder', 'doc') NOT NULL COMMENT '节点类型：folder文件夹/doc文档',
  MODIFY COLUMN `status` ENUM('published', 'draft') NULL COMMENT '发布状态published/draft（仅doc节点，可空）';
ALTER TABLE `users`
  MODIFY COLUMN `status` ENUM('active', 'disabled') NOT NULL DEFAULT 'active' COMMENT '状态：active启用/disabled停用';

-- 3. 挂载点外键。先防御性清掉孤儿行（正常数据不会有；不清干净加外键会失败）
DELETE dp FROM `doc_placements` dp
  LEFT JOIN `projects` p ON dp.`projectId` = p.`id`
  WHERE p.`id` IS NULL;
DELETE dp FROM `doc_placements` dp
  LEFT JOIN `products` pr ON dp.`productId` = pr.`id`
  WHERE pr.`id` IS NULL;
DELETE dp FROM `doc_placements` dp
  LEFT JOIN `doc_categories` c ON dp.`categoryId` = c.`id`
  WHERE dp.`categoryId` IS NOT NULL AND c.`id` IS NULL;

ALTER TABLE `doc_placements`
  ADD CONSTRAINT `doc_placements_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `doc_placements_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `doc_placements_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `doc_categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. RESTRICT → CASCADE
ALTER TABLE `products` DROP FOREIGN KEY `products_projectId_fkey`;
ALTER TABLE `products` ADD CONSTRAINT `products_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `doc_categories` DROP FOREIGN KEY `doc_categories_productId_fkey`;
ALTER TABLE `doc_categories` ADD CONSTRAINT `doc_categories_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `documents` DROP FOREIGN KEY `documents_productId_fkey`;
ALTER TABLE `documents` ADD CONSTRAINT `documents_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
