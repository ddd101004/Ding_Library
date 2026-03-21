-- 第1步：先查看有多少对话记录
SELECT COUNT(*) as total_conversation_items, COUNT(DISTINCT conversation_id) as unique_conversations
FROM folder_items
WHERE conversation_id IS NOT NULL;

-- 查看重复的conversation_id
SELECT conversation_id, COUNT(*) as count
FROM folder_items
WHERE conversation_id IS NOT NULL
GROUP BY conversation_id
HAVING COUNT(*) > 1;
