# API 文档说明

本目录包含临港图书馆项目的 OpenAPI 3.0.3 规范文档，按功能模块分组管理。

## 📁 文档结构

```
docs/openapi/
├── openapi-auth.json           # 认证模块 (8个接口)
├── openapi-conversations.json  # 对话管理模块 (5个接口)
├── openapi-messages.json       # 消息管理模块 (8个接口)
├── openapi-citations.json      # 论文引用模块 (4个接口)
├── openapi-folders.json        # 文件夹管理模块 (8个接口)
├── openapi-feedback.json       # 反馈管理模块 (2个接口)
├── openapi-ai.json             # AI生成模块 (2个接口) 🆕
└── openapi.json                # 完整文档（包含所有接口）
```

## 📚 模块说明

### 1. 认证模块 (openapi-auth.json)
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `POST /api/auth/reset-pwd` - 重置密码
- `POST /api/auth/send-code` - 发送验证码
- `POST /api/auth/verify-code` - 验证验证码
- `POST /api/auth/check-phone` - 检查手机号是否注册
- `GET /api/auth/info` - 获取当前用户信息

### 2. 对话管理模块 (openapi-conversations.json)
- `POST /api/chat/conversations` - 创建会话
- `GET /api/chat/conversations` - 获取会话列表
- `GET /api/chat/conversations/{id}` - 获取会话详情
- `PATCH /api/chat/conversations/{id}` - 更新会话
- `DELETE /api/chat/conversations/{id}` - 删除会话

### 3. 消息管理模块 (openapi-messages.json)
- `POST /api/chat/messages` - 创建消息
- `GET /api/chat/messages` - 获取消息列表
- `GET /api/chat/messages/{id}` - 获取单个消息详情 🆕
- `PATCH /api/chat/messages/{id}` - 更新消息内容 🆕
- `DELETE /api/chat/messages/{id}` - 删除消息 🆕
- `POST /api/chat/messages/stream` - 流式创建消息
- `GET /api/chat/messages/search` - 搜索消息
- `POST /api/chat/messages/{id}/regenerate` - 重新生成消息

### 4. 论文引用模块 (openapi-citations.json)
- `POST /api/chat/citations` - 创建引用
- `GET /api/chat/citations` - 获取引用列表
- `DELETE /api/chat/citations/{id}` - 删除引用
- `GET /api/chat/citations/format` - 格式化引用（支持 APA/MLA/Chicago/GB7714）

### 5. 文件夹管理模块 (openapi-folders.json)
- `POST /api/folders` - 创建文件夹
- `GET /api/folders` - 获取文件夹列表
- `GET /api/folders/{id}` - 获取文件夹详情
- `PATCH /api/folders/{id}` - 更新文件夹
- `DELETE /api/folders/{id}` - 删除文件夹
- `GET /api/folders/{id}/papers` - 获取文件夹内的论文
- `POST /api/folders/{id}/papers/{paperId}` - 添加论文到文件夹
- `DELETE /api/folders/{id}/papers/{paperId}` - 从文件夹移除论文
- `GET /api/folders/papers/status` - 批量查询论文收藏状态

### 6. 反馈管理模块 (openapi-feedback.json)
- `POST /api/chat/feedback` - 创建反馈（like/dislike/copy/regenerate）
- `GET /api/chat/feedback/stats` - 获取反馈统计

### 7. AI生成模块 (openapi-ai.json) 🆕
- `POST /api/ai/keywords` - 根据主题关键词生成相关关键词列表
- `POST /api/ai/questions` - 根据主题关键词生成问题列表

## 🛠️ 使用工具

可以使用以下工具导入和测试 OpenAPI 文档：

1. **Swagger UI** - 在线预览和测试
   ```bash
   # 访问: https://editor.swagger.io
   # 复制 JSON 内容粘贴即可
   ```

2. **Postman** - 导入并生成接口集合
   - File → Import → 选择 JSON 文件
   - 自动生成请求集合

3. **Apifox / ApiPost** - 国内流行的 API 管理工具
   - 支持团队协作
   - 自动生成 Mock 数据

4. **VS Code 扩展**
   - OpenAPI (Swagger) Editor
   - 实时预览和验证

## 📝 文档维护规范

⚠️ **重要**: 当修改 API 接口时，必须同步更新对应的 OpenAPI 文档！

### 新增接口
在对应模块的 JSON 文件中添加接口定义：
```json
{
  "paths": {
    "/api/new/endpoint": {
      "post": {
        "tags": ["模块名"],
        "summary": "接口简述",
        "description": "接口详细描述",
        "operationId": "operationName",
        "security": [{"bearerAuth": []}],
        "requestBody": { ... },
        "responses": { ... }
      }
    }
  }
}
```

### 修改接口
更新以下内容：
- `requestBody` - 请求参数变化
- `responses` - 响应格式变化
- `description` - 描述更新

### 删除接口
从对应模块的 `paths` 中移除该接口定义。

## 📊 接口统计

| 模块 | 接口数量 | 文件 |
|------|---------|------|
| 认证 | 8 | openapi-auth.json |
| 对话管理 | 5 | openapi-conversations.json |
| 消息管理 | 9 | openapi-messages.json |
| 论文引用 | 2 | openapi-citations.json |
| 文件夹管理 | 8 | openapi-folders.json |
| 反馈管理 | 2 | openapi-feedback.json |
| AI生成 🆕 | 2 | openapi-ai.json |
| **总计** | **36** | - |

## 🔗 相关链接

- [OpenAPI 规范](https://swagger.io/specification/)
- [Swagger Editor](https://editor.swagger.io/)
- [项目主文档](../../CLAUDE.md)
