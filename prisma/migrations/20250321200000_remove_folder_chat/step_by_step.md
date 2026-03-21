-- ========================================
-- 分步执行方案（请按顺序一条条执行）
-- ========================================

-- 步骤1：禁用约束检查
SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;

-- 步骤2：查看有多少条对话记录需要删除
SELECT COUNT(*) FROM folder_items WHERE conversation_id IS NOT NULL;

-- 步骤3：删除所有对话记录（直接删除，不复制）
DELETE FROM folder_items WHERE conversation_id IS NOT NULL;

-- 步骤4：删除整个表
DROP TABLE folder_items;

-- 步骤5：创建新表（不含 conversation_id）
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

-- 步骤6：从备份恢复非对话数据（如果您之前有备份的话，否则跳过）
-- INSERT INTO folder_items SELECT * FROM folder_items_backup;

-- 步骤7：删除 chat_conversations 表字段
ALTER TABLE chat_conversations DROP COLUMN folder_id;
ALTER TABLE chat_conversations DROP COLUMN uploaded_paper_id;
ALTER TABLE chat_conversations DROP COLUMN context_mode;
ALTER TABLE chat_conversations DROP COLUMN conversation_type;

-- 步骤8：恢复约束检查
SET UNIQUE_CHECKS = 1;
SET FOREIGN_KEY_CHECKS = 1;

-- ========================================
-- 注意：步骤6可能需要您从其他地方恢复 paper 类型的数据
-- ========================================
