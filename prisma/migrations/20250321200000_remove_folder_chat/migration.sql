-- Migration: 删除文件夹知识库对话功能
-- Date: 2025-03-21 20:00:00

-- ==================== 第一步：删除所有对话相关的文件夹项 ====================

-- 方式1：直接删除（推荐）
-- 注意：如果有唯一索引冲突，先禁用索引检查
SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;

-- 删除所有对话类型的文件夹项
DELETE FROM folder_items WHERE conversation_id IS NOT NULL;

-- 恢复检查
SET UNIQUE_CHECKS = 1;
SET FOREIGN_KEY_CHECKS = 1;

-- ==================== 第二步：安全删除约束和字段 ====================

-- 先删除唯一索引（如果存在）
-- 注意：MySQL会自动删除相关索引，但如果失败可以手动删除
-- ALTER TABLE folder_items DROP INDEX folder_items_folder_id_conversation_id_key;

-- 删除 folder_items 表的 conversation_id 字段（会自动删除相关索引和外键）
ALTER TABLE folder_items DROP COLUMN conversation_id;

-- 删除 chat_conversations 表的相关字段（会自动删除相关索引和外键）
ALTER TABLE chat_conversations DROP COLUMN folder_id;
ALTER TABLE chat_conversations DROP COLUMN uploaded_paper_id;
ALTER TABLE chat_conversations DROP COLUMN context_mode;
ALTER TABLE chat_conversations DROP COLUMN conversation_type;

-- ==================== 迁移完成 ====================
-- 注意：执行完此SQL后，需要运行 pnpm prisma generate 重新生成 Prisma Client
