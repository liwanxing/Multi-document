-- 撤掉 documents.productId 的外键：它是存储位置键（真实产品 id 或文档库虚拟锚点
-- "library"），不是硬引用。后台新建文档与复制项目都用 productId="library"，
-- 外键会让这两条主路径在库后端上必然 500。真实归属关系在 doc_placements（有外键）。
-- 查询不受影响：unique(productId, slug, status) 的最左前缀仍充当 productId 索引。
ALTER TABLE `documents` DROP FOREIGN KEY `documents_productId_fkey`;
