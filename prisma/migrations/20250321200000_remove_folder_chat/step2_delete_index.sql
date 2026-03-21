-- 第2步：先删除唯一索引（如果无法删除数据，就直接删除索引）
ALTER TABLE folder_items DROP INDEX folder_items_folder_id_conversation_id_key;

-- 第3步：删除所有对话记录
DELETE FROM folder_items WHERE conversation_id IS NOT NULL;

-- 第4步：删除普通索引（如果存在）
ALTER TABLE folder_items DROP INDEX conversation_id;

-- 第5步：删除字段
ALTER TABLE folder_items DROP COLUMN conversation_id;

-- 第6步：删除 chat_conversations 表字段
ALTER TABLE chat_conversations DROP COLUMN folder_id;
ALTER TABLE chat_conversations DROP COLUMN uploaded_paper_id;
ALTER TABLE chat_conversations DROP COLUMN context_mode;
ALTER TABLE chat_conversations DROP COLUMN conversation_type;
