-- Migration: 删除文件夹知识库对话功能（最终方案）
-- Date: 2025-03-21 20:00:00

-- ==================== 方案：重建表（绕过索引约束）====================

-- 步骤1：创建新表（不包含 conversation_id 相关）
CREATE TABLE folder_items_new (
  item_id VARCHAR(36) NOT NULL PRIMARY KEY,
  folder_id VARCHAR(36) NOT NULL,
  paper_id VARCHAR(36) NULL,
  uploaded_paper_id VARCHAR(36) NULL,
  notes TEXT NULL,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- 外键约束
  FOREIGN KEY (folder_id) REFERENCES paper_folders(folder_id) ON DELETE CASCADE,
  FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_paper_id) REFERENCES user_uploaded_papers(id) ON DELETE CASCADE,

  -- 唯一索引（不包含 conversation_id）
  UNIQUE KEY folder_items_folder_id_paper_id_key (folder_id, paper_id),
  UNIQUE KEY folder_items_folder_id_uploaded_paper_id_key (folder_id, uploaded_paper_id),
  INDEX idx_folder_id (folder_id),
  INDEX idx_paper_id (paper_id),
  INDEX idx_uploaded_paper_id (uploaded_paper_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 步骤2：复制非对话类型的数据到新表
INSERT INTO folder_items_new
SELECT
  item_id,
  folder_id,
  paper_id,
  uploaded_paper_id,
  notes,
  added_at,
  create_time,
  update_time
FROM folder_items
WHERE conversation_id IS NULL;

-- 步骤3：删除旧表
DROP TABLE folder_items;

-- 步骤4：重命名新表
RENAME TABLE folder_items_new TO folder_items;

-- ==================== 删除 chat_conversations 表字段 ====================

ALTER TABLE chat_conversations DROP COLUMN folder_id;
ALTER TABLE chat_conversations DROP COLUMN uploaded_paper_id;
ALTER TABLE chat_conversations DROP COLUMN context_mode;
ALTER TABLE chat_conversations DROP COLUMN conversation_type;

-- ==================== 迁移完成 ====================
-- 注意：执行完此SQL后，需要运行 pnpm prisma generate 重新生成 Prisma Client
