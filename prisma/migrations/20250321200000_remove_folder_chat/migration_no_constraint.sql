-- Migration: 删除文件夹知识库对话功能（无约束方案）
-- Date: 2025-03-21 20:00:00

-- ==================== 关键：先禁用所有约束检查 ====================

SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';

-- 步骤1：备份非对话数据（无约束检查）
CREATE TABLE folder_items_backup (
  item_id VARCHAR(36),
  folder_id VARCHAR(36),
  paper_id VARCHAR(36),
  uploaded_paper_id VARCHAR(36),
  notes TEXT,
  added_at DATETIME,
  create_time DATETIME,
  update_time DATETIME
) ENGINE=InnoDB;

INSERT INTO folder_items_backup
SELECT item_id, folder_id, paper_id, uploaded_paper_id, notes, added_at, create_time, update_time
FROM folder_items
WHERE conversation_id IS NULL;

-- 步骤2：删除旧表
DROP TABLE folder_items;

-- 步骤3：创建新表（不包含 conversation_id）
CREATE TABLE folder_items (
  item_id VARCHAR(36) NOT NULL,
  folder_id VARCHAR(36) NOT NULL,
  paper_id VARCHAR(36) NULL,
  uploaded_paper_id VARCHAR(36) NULL,
  notes TEXT NULL,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  create_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (item_id),
  FOREIGN KEY (folder_id) REFERENCES paper_folders(folder_id) ON DELETE CASCADE,
  FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_paper_id) REFERENCES user_uploaded_papers(id) ON DELETE CASCADE,

  UNIQUE KEY folder_items_folder_id_paper_id_key (folder_id, paper_id),
  UNIQUE KEY folder_items_folder_id_uploaded_paper_id_key (folder_id, uploaded_paper_id),
  INDEX idx_folder_id (folder_id),
  INDEX idx_paper_id (paper_id),
  INDEX idx_uploaded_paper_id (uploaded_paper_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 步骤4：恢复数据（无约束检查）
INSERT INTO folder_items
SELECT * FROM folder_items_backup;

-- 步骤5：删除备份表
DROP TABLE folder_items_backup;

-- 步骤6：删除 chat_conversations 表字段
ALTER TABLE chat_conversations DROP COLUMN folder_id;
ALTER TABLE chat_conversations DROP COLUMN uploaded_paper_id;
ALTER TABLE chat_conversations DROP COLUMN context_mode;
ALTER TABLE chat_conversations DROP COLUMN conversation_type;

-- ==================== 恢复约束检查 ====================

SET UNIQUE_CHECKS = 1;
SET FOREIGN_KEY_CHECKS = 1;

-- ==================== 迁移完成 ====================
-- 注意：执行完此SQL后，需要运行 pnpm prisma generate 重新生成 Prisma Client
