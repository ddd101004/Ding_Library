# API 接口统计说明（最新版）

> 更新时间: 2026-03-21  
> 基于实际代码生成

## 📊 总体统计

**接口总数**: 约 41 个（已删除未使用的6个论文接口 + 10个冗余接口）
**API文件数**: 36 个

## 📁 模块分布

| 模块 | 文件数 | 接口数 | 说明 |
|------|--------|--------|------|
| 认证模块 (auth) | 10 | 9 | 登录、注册、验证码、密码重置等 |
| 聊天模块 (chat) | 13 | 15 | 对话、消息、引用、反馈等 |
| 搜索模块 (search) | 2 | 2 | 论文搜索、综合搜索 |
| 论文模块 (papers) | 1 | 1 | 论文详情（仅保留查询功能） |
| 文件夹模块 (folders) | 8 | 10 | 文件夹管理、内容管理 |
| 用户模块 (user) | 2 | 2 | 头像、搜索历史 |
| AI功能模块 (ai) | 2 | 2 | 关键词生成、问题生成 |
| 上传模块 (upload) | 3 | 4 | 封面上传、文件访问 |

## 📝 保留的论文模块接口

### ✅ GET /api/papers/[id] - 获取论文详情
- **调用位置**: `src/pages/paper/[id].tsx`
- **功能**: 显示论文详细信息
- **状态**: 正在使用中

## 🗑️ 已删除的论文模块接口（2026-03-21）

1. ❌ GET /api/papers/[id]/download - 下载论文PDF
2. ❌ GET /api/papers/config - 获取EBSCO配置
3. ❌ PUT /api/papers/config - 更新EBSCO配置
4. ❌ GET /api/papers/sync - 获取同步日志
5. ❌ POST /api/papers/sync - 手动触发同步
6. ❌ GET /api/papers/sync/[id] - 获取同步日志详情

**删除原因**: 前端未调用，功能未使用

## 🗑️ 今日删除的冗余接口（2026-03-21 第二轮）

### 认证模块
1. ❌ PATCH /api/auth/info - 更新用户资料

**删除原因**: 前端未调用，功能未使用

### 用户模块
1. ❌ DELETE /api/user/account - 删除账户

**删除原因**: 前端未调用，功能未使用

### 配置模块（全部删除）
1. ❌ GET /api/common-config - 获取配置列表
2. ❌ GET /api/common-config/[key] - 获取单个配置
3. ❌ PUT /api/common-config/[key] - 更新配置

**删除原因**: 前端未调用，功能未使用

### 系统模块
1. ❌ GET /api/alive - 健康检查

**删除原因**: 前端未调用，功能未使用

### 聊天模块
1. ❌ POST /api/chat/messages - 发送消息（非流式）

**删除原因**: 前端只使用流式接口 `/api/chat/messages/stream`

2. ❌ GET /api/chat/messages/[id] - 获取消息详情

**删除原因**: 前端未调用

3. ❌ PATCH /api/chat/messages/[id] - 更新消息

**删除原因**: 前端未调用，无编辑消息功能

4. ❌ DELETE /api/chat/messages/[id] - 删除消息

**删除原因**: 前端未调用，无删除消息功能

## 📌 之前已删除的接口

### 通知模块（全部删除）
- GET /api/user/notifications
- PATCH /api/user/notifications/[id]
- PATCH /api/user/notifications/read-all
- GET /api/user/notifications/unread-count

### 收藏功能（已移除）
- POST /api/user/favorites
- GET /api/user/favorites
- DELETE /api/user/favorites

### 搜索功能（部分删除）
- GET /api/search/scholars
- GET /api/search/patents
- GET /api/search/statistics

## 📂 完整接口列表

### 认证模块 (9个)
1. POST /api/auth/login - 用户登录
2. POST /api/auth/register - 用户注册
3. POST /api/auth/logout - 用户登出
4. POST /api/auth/send-code - 发送验证码
5. POST /api/auth/verify-code - 验证验证码
6. POST /api/auth/reset-pwd - 重置密码
7. GET /api/auth/check - 检查认证状态
8. POST /api/auth/check-phone - 检查手机号是否注册
9. GET /api/auth/info - 获取用户信息

### 聊天模块 (15个)
1. POST /api/chat/conversations - 创建会话
2. GET /api/chat/conversations - 获取会话列表
3. GET /api/chat/conversations/[id] - 获取会话详情
4. PATCH /api/chat/conversations/[id] - 更新会话
5. DELETE /api/chat/conversations/[id] - 删除会话
6. GET /api/chat/messages - 获取消息列表
7. POST /api/chat/messages/stream - 流式发送消息
8. POST /api/chat/messages/[id]/regenerate - 重新生成
9. GET /api/chat/messages/search - 搜索消息
10. POST /api/chat/feedback - 提交反馈
11. GET /api/chat/feedback/stats - 反馈统计
12. GET /api/chat/citations/format - 格式化引用
13. GET /api/chat/citations/download - 下载引用
14. GET /api/chat/conversations/[id]/related-papers - 获取相关论文
15. POST /api/chat/conversations/[id]/message-versions - 批量获取消息版本

### 搜索模块 (2个)
1. POST /api/search/papers - 论文搜索
2. POST /api/search/comprehensive - 综合搜索

### 论文模块 (1个)
1. GET /api/papers/[id] - 获取论文详情

### 文件夹模块 (10个)
1. POST /api/folders - 创建文件夹
2. GET /api/folders - 获取文件夹列表
3. GET /api/folders/[id] - 获取文件夹详情
4. PATCH /api/folders/[id] - 更新文件夹
5. DELETE /api/folders/[id] - 删除文件夹
6. POST /api/folders/[id]/items - 添加内容
7. GET /api/folders/[id]/items - 获取内容列表
8. POST /api/folders/items/move - 移动内容
9. POST /api/folders/items/remove - 移除内容
10. GET /api/folders/items/status - 查询加入状态

### 用户模块 (3个)
1. GET /api/user/avatar - 获取头像
2. GET /api/user/search-history - 获取搜索历史
3. DELETE /api/user/search-history - 删除搜索历史

### AI功能模块 (2个)
1. POST /api/ai/keywords - 生成关键词
2. POST /api/ai/questions - 生成问题

### 上传模块 (4个)
1. POST /api/upload/cover - 上传封面
2. POST /api/ai-reading/papers - 上传论文
3. GET /api/uploaded-papers/[id] - 获取论文详情
4. GET /api/uploads/[...path] - 访问文件

## 📈 接口使用情况

### 高频使用（核心功能）
- 认证模块: 9/9 (100%)
- 聊天模块: 15/15 (100%)
- 文件夹模块: 10/10 (100%)

### 中频使用
- 搜索模块: 2/2 (100%)
- 论文模块: 1/1 (100%)

### 低频使用
- 用户模块: 3/3 (100%)
- AI功能: 2/2 (100%)
- 上传模块: 4/4 (100%)

**总结**: 所有保留的接口都在被前端使用，无冗余接口。
