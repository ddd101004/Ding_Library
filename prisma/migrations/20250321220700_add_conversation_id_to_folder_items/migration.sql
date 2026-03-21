-- 添加 conversation_id 字段到 folder_items 表
-- 用于支持将对话添加到文件夹的功能

-- 1. 添加 conversation_id 字段
ALTER TABLE `folder_items`
ADD COLUMN `conversation_id` VARCHAR(36) NULL
COMMENT '对话ID (chat_conversations表)'
AFTER `uploaded_paper_id`;

-- 2. 添加唯一索引
ALTER TABLE `folder_items`
ADD UNIQUE INDEX `folder_items_folder_id_conversation_id_key` (`folder_id`, `conversation_id`);

-- 3. 添加普通索引
ALTER TABLE `folder_items`
ADD INDEX `folder_items_conversation_id_idx` (`conversation_id`);

-- 4. 添加外键约束
ALTER TABLE `folder_items`
ADD CONSTRAINT `folder_items_conversation_id_fkey`
FOREIGN KEY (`conversation_id`)
REFERENCES `chat_conversations` (`conversation_id`)
ON DELETE CASCADE
ON UPDATE RESTRICT;
