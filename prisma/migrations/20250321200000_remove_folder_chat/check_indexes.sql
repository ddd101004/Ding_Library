-- 查询 folder_items 表的所有索引
SHOW INDEX FROM folder_items;

-- 查询 chat_conversations 表的所有索引
SHOW INDEX FROM chat_conversations;

-- 查询外键约束
SELECT
    CONSTRAINT_NAME,
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('folder_items', 'chat_conversations')
  AND REFERENCED_TABLE_NAME IS NOT NULL;
