-- 文件：prisma/migrations/20260321193409_drop_unused_tables/migration.sql
-- 描述：删除废弃的 AI伴读、收藏和通知相关的数据表
-- 创建时间：2026-03-21 19:34:09
-- 更新时间：2026-03-21 19:45:00 (仅删除实际存在的字段)

-- 注意：执行前请确认以下事项：
-- 1. 已备份重要数据（如有）
-- 2. 应用已停止使用这些表的功能
-- 3. 确认这些表不再被其他表引用

-- ============================================
-- 第一步：删除废弃的数据表
-- ============================================

-- 删除收藏表（favorites）
DROP TABLE IF EXISTS `favorites`;

-- 删除论文标注表（paper_annotations）
DROP TABLE IF EXISTS `paper_annotations`;

-- 删除论文阅读记录表（paper_reading_records）
DROP TABLE IF EXISTS `paper_reading_records`;

-- 删除用户通知表（user_notifications）
DROP TABLE IF EXISTS `user_notifications`;

-- ============================================
-- 第二步：删除现有表中的废弃字段（仅实际存在的字段）
-- ============================================

-- 从 paper_folders 表删除 FastGPT 相关字段
ALTER TABLE `paper_folders` DROP COLUMN `fastgpt_dataset_id`;

-- 从 user_uploaded_papers 表删除 AI伴读相关字段
ALTER TABLE `user_uploaded_papers` DROP COLUMN `annotation_count`;
ALTER TABLE `user_uploaded_papers` DROP COLUMN `citation_count`;

-- ============================================
-- 说明：以下表的字段已在之前删除或不存在
-- ============================================
-- users.fastgpt_root_dataset_id - 不存在，无需删除
-- papers.fastgpt_collection_id - 不存在，无需删除
-- papers.fastgpt_sync_source - 不存在，无需删除
-- papers.fastgpt_sync_time - 不存在，无需删除
-- papers.fastgpt_has_fulltext - 不存在，无需删除
-- papers 索引 fastgpt_collection_id - 不存在，无需删除

-- ============================================
-- 迁移完成
-- ============================================

-- 验证语句（可选，执行后查看结果）
-- SHOW TABLES LIKE '%favorite%';
-- SHOW TABLES LIKE '%annotation%';
-- SHOW TABLES LIKE '%reading%';
-- SHOW TABLES LIKE '%notification%';
