-- 文件：prisma/migrations/20260321062001_remove_doc_delivery/migration.sql
-- 说明：删除文献传递功能相关的表和字段

-- 删除全文传递请求表
DROP TABLE IF EXISTS `doc_delivery_requests`;
