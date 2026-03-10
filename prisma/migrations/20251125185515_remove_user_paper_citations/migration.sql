-- 删除用户论文引用表
-- 说明：引用功能已简化，用户可以直接在发送消息时把选中的文本放到 context_text 里，AI 会自动帮忙格式化引用

DROP TABLE IF EXISTS `user_paper_citations`;
