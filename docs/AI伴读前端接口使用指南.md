# AI 伴读前端接口使用指南

> 本文档说明 AI 伴读助手各功能场景下的接口调用流程、参数传递和功能串联方式

## 目录

1. [论文上传与解析流程](#论文上传与解析流程)
2. [伴读对话创建与管理](#伴读对话创建与管理)
3. [AI 交互功能使用](#ai-交互功能使用)
4. [标注管理](#标注管理)
5. [阅读统计查询](#阅读统计查询)
6. [完整功能串联示例](#完整功能串联示例)

---

## 论文上传与解析流程

### 场景 1：用户上传论文文件

**接口：** `POST /api/ai-reading/papers`

**请求参数：**

```typescript
// 使用 FormData 上传
const formData = new FormData();
formData.append("file", pdfFile); // 论文文件（PDF/Word/TXT）
formData.append("title", "论文标题"); // 可选，默认使用文件名
formData.append("authors", '["张三", "李四"]'); // 可选
formData.append("keywords", '["机器学习", "深度学习"]'); // 可选
```

**响应数据：**

```json
{
  "message": "论文上传成功",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "AI视觉识别论文",
    "file_name": "paper.pdf",
    "file_size": 2048576,
    "file_type": "pdf",
    "parse_status": "pending", // 解析状态：pending/parsing/completed/failed
    "create_time": "2025-11-25T13:30:00Z"
  }
}
```

**注意事项：**

- 文件上传后会自动触发异步解析（不阻塞响应）
- 支持格式：PDF、Word (.docx)、TXT
- 最大文件大小：50MB（可配置）
- 上传成功后 `parse_status` 为 `pending`，需要轮询或监听状态变化

---

### 场景 2：查看论文解析状态

**接口：** `GET /api/ai-reading/papers/{id}`

**请求参数：**

```typescript
// URL 路径参数
const paperId = "550e8400-e29b-41d4-a716-446655440000";
```

**响应数据：**

```json
{
  "message": "获取成功",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "AI视觉识别论文",
    "authors": ["张三", "李四"],
    "abstract": "",
    "keywords": ["机器学习"],
    "file_name": "paper.pdf",
    "file_size": 2048576,
    "parse_status": "completed", // 解析完成
    "parsed_content": "论文全文内容...", // 解析后的文本
    "page_count": 15,
    "word_count": 8000,
    "parse_error": "", // 解析错误信息（空字符串表示无错误）
    "parsed_at": "2025-11-25T13:31:00Z",
    "read_count": 3,
    "conversation_count": 1,
    "annotation_count": 5,
    "citation_count": 2,
    "last_read_at": "2025-11-25T14:00:00Z",
    "create_time": "2025-11-25T13:30:00Z"
  }
}
```

**使用场景：**

- 上传后轮询检查解析状态（`parse_status === "completed"`）
- 进入论文详情页时获取完整信息
- 显示阅读统计（阅读次数、标注数、引用数）

---

### 场景 3：获取论文列表

**接口：** `GET /api/ai-reading/papers`

**请求参数：**

```typescript
const params = {
  page: 1, // 页码（默认 1）
  size: 10, // 每页数量（默认 10，最大 100）
  sort_by: "create_time", // 排序字段：create_time/last_read_at/title
  order: "desc", // 排序方向：asc/desc
  parse_status: "completed", // 筛选解析状态（可选）
  keyword: "机器学习", // 搜索关键词（可选）
};
```

**响应数据：**

```json
{
  "message": "获取成功",
  "data": {
    "total": 25,
    "page": 1,
    "size": 10,
    "items": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "AI视觉识别论文",
        "authors": ["张三", "李四"], // 确保是数组
        "file_name": "paper.pdf",
        "file_size": 2048576,
        "file_type": "pdf",
        "parse_status": "completed",
        "page_count": 15,
        "word_count": 8000,
        "read_count": 3,
        "conversation_count": 1,
        "annotation_count": 5,
        "citation_count": 2,
        "last_read_at": "2025-11-25T14:00:00Z",
        "create_time": "2025-11-25T13:30:00Z"
      }
    ]
  }
}
```

**使用场景：**

- 论文库列表页展示
- 支持分页加载
- 支持按状态筛选（仅显示解析完成的论文）
- 支持搜索功能

---

## 伴读对话创建与管理

### 场景 4：为论文创建伴读对话

**接口：** `POST /api/ai-reading/conversations`

**请求参数：**

```json
{
  "uploaded_paper_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "AI视觉识别论文伴读", // 可选，默认使用论文标题
  "is_deep_think": false // 可选，是否启用深度思考模式（DeepSeek-R1）
}
```

**响应数据：**

```json
{
  "message": "创建成功",
  "data": {
    "conversation_id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "AI视觉识别论文伴读",
    "model": "deepseek-v3", // 使用的模型
    "is_deep_think": false,
    "conversation_type": "paper_reading",
    "message_count": 0,
    "last_message_at": null,
    "create_time": "2025-11-25T14:05:00Z"
  }
}
```

**注意事项：**

- **幂等性**：一个论文只能有一个对话，重复调用返回已存在的对话
- 创建对话前确保论文已解析完成（`parse_status === "completed"`）
- 深度思考模式使用 DeepSeek-R1 模型，提供更深入的分析

---

### 场景 5：获取对话列表

**接口：** `GET /api/ai-reading/conversations`

**请求参数：**

```typescript
const params = {
  page: 1,
  size: 10,
};
```

**响应数据：**

```json
{
  "message": "获取成功",
  "data": {
    "total": 15,
    "page": 1,
    "size": 10,
    "items": [
      {
        "conversation_id": "123e4567-e89b-12d3-a456-426614174000",
        "title": "AI视觉识别论文伴读",
        "conversation_type": "paper_reading",
        "uploaded_paper_id": "550e8400-e29b-41d4-a716-446655440000",
        "message_count": 12,
        "is_deep_think": false,
        "is_pinned": false,
        "last_message_at": "2025-11-25T15:30:00Z",
        "last_message_preview": "这段话的核心观点是...", // 最后一条消息预览（前50字符）
        "create_time": "2025-11-25T14:05:00Z"
      }
    ]
  }
}
```

**使用场景：**

- 对话历史列表页
- 展示每个对话的最后消息预览
- 支持置顶对话（is_pinned）

---

### 场景 6：获取对话详情和论文信息

**接口：** `GET /api/ai-reading/conversations/{id}`

**响应数据：**

```json
{
  "message": "获取成功",
  "data": {
    "conversation_id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "AI视觉识别论文伴读",
    "conversation_type": "paper_reading",
    "uploaded_paper_id": "550e8400-e29b-41d4-a716-446655440000",
    "message_count": 12,
    "is_deep_think": false,
    "is_pinned": false,
    "last_message_at": "2025-11-25T15:30:00Z",
    "create_time": "2025-11-25T14:05:00Z",
    "paper": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "AI视觉识别论文",
      "authors": ["张三", "李四"],
      "abstract": "本文提出了一种新的视觉识别方法...",
      "keywords": "机器学习,深度学习,计算机视觉"
    }
  }
}
```

**使用场景：**

- 进入对话页时获取对话和论文信息
- 显示论文标题、作者等元数据
- 显示对话设置（深度思考模式、置顶状态）

---

### 场景 7：获取对话消息历史

**接口：** `GET /api/ai-reading/conversations/{id}/messages`

**请求参数：**

```typescript
const params = {
  before_order: 100, // 可选，获取指定顺序之前的消息（用于向上翻页）
  size: 20, // 每次获取数量（默认 20，最大 100）
};
```

**响应数据：**

```json
{
  "message": "获取成功",
  "data": {
    "items": [
      {
        "message_id": "msg-001",
        "role": "user",
        "content": "请解释一下这段话的核心观点",
        "content_type": "text",
        "message_order": 1,
        "message_type": "analyze", // 操作类型：analyze/translate/summarize/explain
        "reasoning_content": "", // DeepSeek-R1 思考过程（深度思考模式下有值）
        "reasoning_tokens": 0,
        "context_text": "选中的论文文本片段...",
        "context_range": {
          "start": 100,
          "end": 200,
          "page": 1
        },
        "input_tokens": 50,
        "output_tokens": 0,
        "total_tokens": 50,
        "status": "completed",
        "error_message": "",
        "parent_message_id": "",
        "citations": [],
        "create_time": "2025-11-25T15:00:00Z"
      },
      {
        "message_id": "msg-002",
        "role": "assistant",
        "content": "这段话的核心观点是...",
        "content_type": "text",
        "message_order": 2,
        "message_type": "analyze",
        "reasoning_content": "", // 普通模式下为空
        "reasoning_tokens": 0,
        "context_text": "",
        "context_range": undefined,
        "input_tokens": 50,
        "output_tokens": 150,
        "total_tokens": 200,
        "status": "completed",
        "error_message": "",
        "parent_message_id": "msg-001",
        "citations": [],
        "create_time": "2025-11-25T15:00:15Z"
      }
    ],
    "has_more": true
  }
}
```

**使用场景：**

- 对话页初始加载历史消息
- 向上滚动加载更多历史消息（传入 `before_order`）
- 支持游标分页（基于 message_order）

---

## AI 交互功能使用

### 场景 8：发送消息获取 AI 回复（统一接口）

**接口：** `POST /api/ai-reading/messages/send`

**这是核心接口，支持 4 种操作类型：**

1. **analyze**（分析理解）- 默认
2. **translate**（翻译文本）
3. **summarize**（总结内容）
4. **explain**（解释概念）

#### 8.1 普通对话（analyze）

**请求参数：**

```json
{
  "conversation_id": "123e4567-e89b-12d3-a456-426614174000",
  "content": "这段话的核心观点是什么？",
  "context_text": "选中的论文文本片段...", // 可选，用户选中的文本
  "context_range": {
    // 可选，文本位置信息
    "start": 100,
    "end": 200,
    "page": 1
  },
  "operation_type": "analyze", // 默认值
  "target_language": "英文" // 仅翻译时使用
}
```

**响应（SSE 流式）：**

```
data: {"type":"start","message_id":"msg-003","message_order":3}

data: {"type":"token","content":"这段话"}

data: {"type":"token","content":"的核心"}

data: {"type":"token","content":"观点是..."}

data: {"type":"done","message_id":"msg-003","input_tokens":50,"output_tokens":150,"total_tokens":200}
```

#### 8.2 翻译功能（translate）

**请求参数：**

```json
{
  "conversation_id": "123e4567-e89b-12d3-a456-426614174000",
  "content": "请把这段话翻译成英文", // 用户请求
  "context_text": "这技术来一个对抗目镜码头...", // 选中的中文文本
  "context_range": {
    "start": 500,
    "end": 600,
    "page": 2
  },
  "operation_type": "translate", // 翻译操作
  "target_language": "英文" // 目标语言
}
```

**SSE 响应：**

```
data: {"type":"start","message_id":"msg-004","message_order":4}

data: {"type":"token","content":"This technology"}

data: {"type":"token","content":" uses adversarial..."}

data: {"type":"done","message_id":"msg-004","input_tokens":60,"output_tokens":80,"total_tokens":140}
```

#### 8.3 总结功能（summarize）

**请求参数：**

```json
{
  "conversation_id": "123e4567-e89b-12d3-a456-426614174000",
  "content": "总结一下这段内容",
  "context_text": "长篇论文段落...",
  "context_range": {
    "start": 1000,
    "end": 2000,
    "page": 3
  },
  "operation_type": "summarize"
}
```

#### 8.4 解释功能（explain）

**请求参数：**

```json
{
  "conversation_id": "123e4567-e89b-12d3-a456-426614174000",
  "content": "用通俗的语言解释一下这个概念",
  "context_text": "卷积神经网络（CNN）是一种深度学习算法...",
  "context_range": {
    "start": 300,
    "end": 400,
    "page": 1
  },
  "operation_type": "explain"
}
```

#### 8.5 深度思考模式（DeepSeek-R1）

当对话启用了深度思考模式时，响应会包含推理过程：

**SSE 响应：**

```
data: {"type":"start","message_id":"msg-005","message_order":5}

data: {"type":"reasoning","content":"首先分析问题的核心..."}

data: {"type":"reasoning","content":"然后考虑多个可能的角度..."}

data: {"type":"reasoning","content":"综合以上分析..."}

data: {"type":"token","content":"基于深入思考，"}

data: {"type":"token","content":"我认为..."}

data: {"type":"done","message_id":"msg-005","input_tokens":100,"output_tokens":200,"total_tokens":300}
```

**注意事项：**

- `type: "reasoning"` 表示思考过程（可单独显示或折叠）
- `type: "token"` 表示正式回答内容
- 思考过程和正式回答都会保存到数据库

#### 8.6 消息级别的深度思考控制

**新特性**：除了对话级别的深度思考设置外，现在支持在发送消息时通过 `is_deep_think` 参数动态控制是否使用深度思考模式。

**使用场景：**
- 对话默认使用普通模式，但某些复杂问题需要深度思考
- 对话默认使用深度思考，但某些简单问题想要快速回答
- 灵活控制成本和响应速度

**请求参数：**

```json
{
  "conversation_id": "123e4567-e89b-12d3-a456-426614174000",
  "content": "请深入分析这段话的论证逻辑",
  "context_text": "研究表明...",
  "operation_type": "analyze",
  "is_deep_think": true  // ✨ 新增：消息级别控制深度思考
}
```

**行为规则：**

1. **优先级**：`is_deep_think` 参数（如果提供）> 对话级别 `is_deep_think` 设置
2. **覆盖逻辑**：
   - `is_deep_think: true` → 强制使用 DeepSeek-R1（深度思考）
   - `is_deep_think: false` → 强制使用普通模型
   - `is_deep_think` 未提供 → 使用对话级别的设置

**示例 1：临时启用深度思考**

```typescript
// 对话创建时禁用深度思考（节省成本）
POST /api/ai-reading/conversations
{
  "uploaded_paper_id": "xxx",
  "is_deep_think": false
}

// 发送普通问题（使用普通模型）
POST /api/ai-reading/messages/send
{
  "conversation_id": "xxx",
  "content": "这段话翻译成英文",
  "operation_type": "translate"
  // 不传 is_deep_think，使用对话默认设置（false）
}

// 遇到复杂问题时临时启用深度思考
POST /api/ai-reading/messages/send
{
  "conversation_id": "xxx",
  "content": "深入分析这个研究方法的优缺点",
  "operation_type": "analyze",
  "is_deep_think": true  // ✨ 仅此消息使用深度思考
}
```

**示例 2：临时禁用深度思考**

```typescript
// 对话创建时启用深度思考（深度分析）
POST /api/ai-reading/conversations
{
  "uploaded_paper_id": "xxx",
  "is_deep_think": true
}

// 需要快速翻译时临时禁用深度思考
POST /api/ai-reading/messages/send
{
  "conversation_id": "xxx",
  "content": "翻译这段话",
  "context_text": "...",
  "operation_type": "translate",
  "is_deep_think": false  // ✨ 临时使用普通模型，加快响应
}
```

**成本和性能权衡：**

| 模式         | 模型          | Token 成本 | 响应速度 | 适用场景           |
| ------------ | ------------- | ---------- | -------- | ------------------ |
| 普通模式     | deepseek-v3   | 低         | 快       | 翻译、总结、简单QA |
| 深度思考模式 | deepseek-r1   | 高         | 慢       | 复杂分析、推理     |

---

### 场景 9：接收和处理 SSE 流式响应

**前端代码示例：**

```typescript
async function sendMessageWithStream(params: SendMessageParams) {
  const response = await fetch("/api/ai-reading/messages/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  let messageId = "";
  let fullContent = "";
  let reasoningContent = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n\n");

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;

      const data = JSON.parse(line.slice(6));

      switch (data.type) {
        case "start":
          messageId = data.message_id;
          // 在界面上创建新的消息气泡
          createMessageBubble(data.message_id, data.message_order);
          break;

        case "reasoning":
          // 深度思考模式：显示推理过程
          reasoningContent += data.content;
          updateReasoningContent(messageId, reasoningContent);
          break;

        case "token":
          // 正式回答：逐字显示
          fullContent += data.content;
          updateMessageContent(messageId, fullContent);
          break;

        case "done":
          // 完成：显示 token 统计
          showTokenStats(messageId, {
            input: data.input_tokens,
            output: data.output_tokens,
            total: data.total_tokens,
          });
          break;

        case "error":
          // 错误：显示错误信息
          showError(messageId, data.message);
          break;
      }
    }
  }
}
```

---

## 标注管理

### 场景 10：创建标注（高亮文本）

**接口：** `POST /api/ai-reading/annotations`

**请求参数：**

```json
{
  "uploaded_paper_id": "550e8400-e29b-41d4-a716-446655440000",
  "annotation_text": "选中的文本内容",  // ✅ 修正：使用 annotation_text 而非 content
  "start_offset": 100,                  // ✅ 修正：使用 start_offset 而非 start_position
  "end_offset": 200,                    // ✅ 修正：使用 end_offset 而非 end_position
  "page_number": 1,                     // 可选
  "note": "这是重点",                   // 可选
  "color": "yellow"                     // 可选，默认 yellow
}
```

**响应数据：**

```json
{
  "message": "创建成功",
  "data": {
    "id": "anno-001",
    "uploaded_paper_id": "550e8400-e29b-41d4-a716-446655440000",
    "annotation_text": "选中的文本内容",
    "annotation_type": "highlight",
    "color": "yellow",
    "page_number": 1,
    "start_offset": 100,
    "end_offset": 200,
    "note": "这是重点",
    "create_time": "2025-11-25T10:00:00Z"
  }
}
```

**使用场景：**

- 用户在 PDF 阅读器中选中文本后点击"标注"
- 保存位置信息以便后续恢复高亮显示

---

### 场景 11：获取论文的所有标注

**接口：** `GET /api/ai-reading/annotations?uploaded_paper_id={id}`

**响应数据：**

```json
{
  "message": "获取成功",
  "data": {
    "total": 10,
    "page": 1,
    "size": 20,
    "items": [
      {
        "id": "anno-001",
        "uploaded_paper_id": "550e8400-e29b-41d4-a716-446655440000",
        "annotation_text": "选中的文本内容",  // ✅ 修正：annotation_text
        "annotation_type": "highlight",
        "color": "yellow",
        "page_number": 1,
        "start_offset": 100,                   // ✅ 修正：start_offset
        "end_offset": 200,                     // ✅ 修正：end_offset
        "position_json": null,                  // PDF 阅读器专用位置数据（可选）
        "note": "这是重点",
        "tags": null,
        "create_time": "2025-11-25T15:30:00Z",
        "update_time": "2025-11-25T15:30:00Z"
      }
    ]
  }
}
```

**使用场景：**

- 打开论文时加载所有标注
- 在 PDF 阅读器中渲染高亮区域
- 支持分页加载（page、size 参数）
- 支持按类型、颜色、标签筛选

---

## 阅读统计查询

### 场景 12：获取阅读记录

**接口：** `GET /api/ai-reading/reading-records`

**响应数据：**

```json
{
  "message": "获取成功",
  "data": [
    {
      "uploaded_paper_id": "550e8400-e29b-41d4-a716-446655440000",
      "paper_title": "AI视觉识别论文",
      "total_reading_time": 3600, // 总阅读时长（秒）
      "annotation_count": 5,
      "citation_count": 2,
      "translation_used": 3, // 翻译使用次数
      "ai_question_asked": 12, // AI 提问次数
      "last_read_at": "2025-11-25T16:00:00Z"
    }
  ]
}
```

**使用场景：**

- 个人中心展示阅读统计
- 数据可视化（阅读时长、提问次数等）

---

## 完整功能串联示例

### 典型用户流程：从上传到伴读

```
1. 用户上传论文
   POST /api/ai-reading/papers
   └─ 返回 paper_id

2. 轮询检查解析状态
   GET /api/ai-reading/papers/{paper_id}
   └─ 等待 parse_status === "completed"

3. 创建伴读对话
   POST /api/ai-reading/conversations
   {
     "uploaded_paper_id": paper_id,
     "is_deep_think": false
   }
   └─ 返回 conversation_id

4. 获取对话详情和论文信息
   GET /api/ai-reading/conversations/{conversation_id}
   └─ 展示论文标题、作者、摘要

5. 加载历史消息
   GET /api/ai-reading/conversations/{conversation_id}/messages
   └─ 展示对话历史

6. 用户选中文本 + 点击"翻译"
   POST /api/ai-reading/messages/send
   {
     "conversation_id": conversation_id,
     "content": "请翻译这段话",
     "context_text": "选中的文本",
     "context_range": { start, end, page },
     "operation_type": "translate",
     "target_language": "英文"
   }
   └─ SSE 流式返回翻译结果

7. 继续对话（无选中文本）
   POST /api/ai-reading/messages/send
   {
     "conversation_id": conversation_id,
     "content": "刚才翻译的内容更详细地解释一下",
     "operation_type": "explain"
   }
   └─ AI 根据上下文理解并回答

8. 用户标注重点
   POST /api/ai-reading/annotations
   {
     "uploaded_paper_id": paper_id,
     "content": "重点内容",
     ...
   }

9. 查看阅读统计
   GET /api/ai-reading/reading-records
   └─ 展示总阅读时长、提问次数等
```

---

## 关键设计要点

### 1. 统一的消息发送接口

所有 AI 交互（翻译/总结/解释/分析）都通过 `POST /api/ai-reading/messages/send` 完成，通过 `operation_type` 参数区分：

| 操作类型 | operation_type | 使用场景       | 是否需要 context_text |
| -------- | -------------- | -------------- | --------------------- |
| 分析理解 | analyze        | 普通对话、提问 | 可选                  |
| 翻译文本 | translate      | 选中文本翻译   | 必需                  |
| 总结内容 | summarize      | 长段落总结     | 必需                  |
| 解释概念 | explain        | 专业术语解释   | 必需                  |

### 2. 连续对话能力

- 所有操作结果都保存到对话历史
- 支持基于历史消息的上下文理解
- 例如：翻译后可以继续问"刚才翻译的内容更详细地解释一下"

### 3. 深度思考模式

- 对话级别设置（创建时指定 `is_deep_think`）
- 使用 DeepSeek-R1 模型
- 返回思考过程（`type: "reasoning"`）和正式回答（`type: "token"`）

### 4. 数据规范

**确保不返回 null 值：**

- 字符串字段：返回空字符串 `""`
- 数组字段：返回空数组 `[]`
- 可选对象字段：返回 `undefined`（不包含在响应中）

**示例：**

```typescript
// ✅ 正确
{
  "authors": [],
  "abstract": "",
  "context_range": undefined
}
```

### 5. SSE 流式响应

**事件类型：**

- `start` - 开始生成
- `reasoning` - 思考过程（仅深度思考模式）
- `token` - 正式回答内容
- `done` - 完成（包含 token 统计）
- `error` - 错误

**前端处理建议：**

- 使用 EventSource 或 fetch + ReadableStream
- 分别处理思考过程和正式回答
- 显示 token 统计（成本透明）

---

## 附录

### A. 完整的前端状态管理示例

```typescript
interface PaperReadingState {
  // 当前论文
  currentPaper: {
    id: string;
    title: string;
    authors: string[];
    abstract: string;
    parseStatus: "pending" | "parsing" | "completed" | "failed";
  } | null;

  // 当前对话
  currentConversation: {
    id: string;
    title: string;
    isDeepThink: boolean;
  } | null;

  // 消息列表
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    reasoningContent?: string; // 深度思考过程
    messageType: "analyze" | "translate" | "summarize" | "explain";
    contextText?: string; // 选中的文本
    createTime: Date;
  }>;

  // 标注列表
  annotations: Array<{
    id: string;
    content: string;
    pageNumber: number;
    startPosition: number;
    endPosition: number;
    color: string;
    note?: string;
  }>;

  // 引用列表
  citations: Array<{
    id: string;
    citedText: string;
    pageNumber: number;
    formattedText?: string;
  }>;
}
```

### B. API 错误码参考

| HTTP 状态码 | 含义             | 处理方式         |
| ----------- | ---------------- | ---------------- |
| 200         | 成功             | 正常处理         |
| 401         | 未授权           | 跳转登录页       |
| 503         | 警告（参数错误） | 显示错误提示     |
| 501         | 服务器错误       | 显示通用错误提示 |

---
