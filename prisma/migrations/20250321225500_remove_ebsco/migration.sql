-- 删除EBSCO相关表和字段
-- 由于系统只使用万方数据源，不再需要EBSCO相关功能

-- 1. 删除EBSCO同步日志表
DROP TABLE IF EXISTS `ebsco_sync_logs`;

-- 2. 删除EBSCO配置表
DROP TABLE IF EXISTS `ebsco_configs`;

-- 3. 删除Paper表中EBSCO特有的字段和索引
ALTER TABLE `papers` DROP COLUMN `db_id`;
ALTER TABLE `papers` DROP COLUMN `an`;
ALTER TABLE `papers` DROP COLUMN `plink`;
ALTER TABLE `papers` DROP COLUMN `custom_links`;
ALTER TABLE `papers` DROP COLUMN `relevancy_score`;

-- 4. 删除EBSCO特有的唯一索引
ALTER TABLE `papers` DROP INDEX `@@unique([db_id, an])`;

-- 5. 更新source字段注释，明确只有wanfang
ALTER TABLE `papers` MODIFY COLUMN `source` VARCHAR(20) COMMENT '数据来源: wanfang';
