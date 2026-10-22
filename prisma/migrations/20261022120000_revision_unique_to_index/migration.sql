-- doc_revisions 的 (docId, version) 唯一约束降为普通索引。
-- 这张表既存发布快照，也存"绑定已有文档"这类动态条目；动态条目沿用
-- published.version，同一 (docId, version) 出现多条是原生（JSON 时代）语义。
-- 唯一约束会静默吞掉绑定动态：对账按"已存在则跳过"去重，绑定的历史条目
-- 撞上首发的同版本快照就永远进不了库，产品动态里看不到这次绑定。
-- 去重职责移到应用层：按条目 id（UUID，天然唯一）判重。
ALTER TABLE `doc_revisions` DROP INDEX `doc_revisions_docId_version_key`;
ALTER TABLE `doc_revisions` ADD INDEX `doc_revisions_docId_version_idx` (`docId`, `version`);
