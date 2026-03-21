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

### 聊天模块 (14个)
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
11. GET /api/chat/citations/format - 格式化引用
12. GET /api/chat/citations/download - 下载引用
13. GET /api/chat/conversations/[id]/related-papers - 获取相关论文
14. POST /api/chat/conversations/[id]/message-versions - 批量获取消息版本

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
- 聊天模块: 14/14 (100%)
- 文件夹模块: 10/10 (100%)

### 中频使用
- 搜索模块: 2/2 (100%)
- 论文模块: 1/1 (100%)

### 低频使用
- 用户模块: 3/3 (100%)
- AI功能: 2/2 (100%)
- 上传模块: 4/4 (100%)