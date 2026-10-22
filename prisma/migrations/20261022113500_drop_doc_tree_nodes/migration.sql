-- 废弃遗留表 doc_tree_nodes：v2 起文档目录树由 doc_categories（文件夹）+ doc_placements（挂载）承载，
-- 该表数据为重复副本，读写链路均已移除（2026-10-22）
DROP TABLE IF EXISTS `doc_tree_nodes`;
