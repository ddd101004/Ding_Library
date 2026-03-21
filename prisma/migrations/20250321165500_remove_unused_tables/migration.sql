-- 删除未使用的表和字段
-- Date: 2025-03-21
-- Description: 删除专利、学者相关表及文献传递通知字段

-- ==================== 1. 删除学者和专利相关的外键字段 ====================
-- 注意：MySQL 删除字段时会自动删除相关的外键约束，无需手动删除

-- SearchHistory 表
ALTER TABLE `search_history` DROP COLUMN `scholar_id`;
ALTER TABLE `search_history` DROP COLUMN `patent_id`;

-- BrowseHistory 表
ALTER TABLE `browse_history` DROP COLUMN `scholar_id`;
ALTER TABLE `browse_history` DROP COLUMN `patent_id`;

-- Favorite 表
ALTER TABLE `favorites` DROP COLUMN `scholar_id`;
ALTER TABLE `favorites` DROP COLUMN `patent_id`;

-- ==================== 2. 删除学者和专利关联表 ====================

-- 删除学者专利关联表
DROP TABLE IF EXISTS `scholar_patents`;

-- 删除学者论文关联表
DROP TABLE IF EXISTS `scholar_papers`;

-- ==================== 3. 删除学者表 ====================

DROP TABLE IF EXISTS `scholars`;

-- ==================== 4. 删除专利表 ====================

DROP TABLE IF EXISTS `patents`;

-- ==================== 执行说明 ====================
--
-- 执行顺序说明：
-- 1. 直接删除字段（MySQL 会自动删除相关的外键约束）
-- 2. 删除关联表（scholar_patents, scholar_papers）
-- 3. 删除主表（scholars, patents）
--
-- 注意事项：
-- - notify_doc_delivery 字段可能在之前的迁移中已删除，本脚本跳过该字段
-- - 删除操作不可逆，请确保已备份数据库
-- - 如果表中有数据，删除表会同时删除所有数据
-- - 建议在测试环境先验证后再在生产环境执行
