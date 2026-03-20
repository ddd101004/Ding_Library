-- 文件：prisma/migrations/20260321060817_add_code_send_count_field/migration.sql
-- 说明：添加验证码发送计数字段，支持1分钟内发送5次验证码

-- AlterTable
ALTER TABLE `users`
  ADD COLUMN `code_send_count_minute` INT NULL DEFAULT 0 COMMENT '当前分钟内的验证码发送次数';
