# D:\Project\library 项目 API 接口完整文档

## 项目概述

本项目是一个基于 Next.js 15 的全栈应用，使用 TypeScript、Prisma ORM 和 MySQL 数据库，提供学术图书馆管理系统，包含用户认证、对话管理、知识库、搜索和AI功能等核心模块。

**技术栈：**
- 框架：Next.js 15.3.0 (Pages Router)
- 语言：TypeScript 5.0.2
- 数据库：MySQL + Prisma ORM 4.11.0
- 认证：JWT + bcrypt
- 日志：Winston

---

## 统计概览

| 模块 | 接口数量 | 需要认证 | 公开接口 |
|------|----------|----------|----------|
| 用户认证 (auth) | 10 | 4 | 6 |
| 对话管理 (chat) | 12 | 12 | 0 |
| 知识库 (folders) | 8 | 8 | 0 |
| 搜索 (search) | 2 | 2 | 0 |
| 论文管理 (papers) | 4 | 4 | 0 |
| 用户设置 (user) | 8 | 8 | 0 |
| AI功能 (ai) | 2 | 2 | 0 |
| 通知 (notifications) | 3 | 3 | 0 |
| 配置 (common-config) | 2 | 2 | 0 |
| 文件上传 (upload/uploads) | 2 | 1 | 1 |
| 同步任务 (sync) | 2 | 2 | 0 |
| 健康检查 | 1 | 0 | 1 |
| **总计** | **58** | **48** | **10** |

---

## 一、用户认证模块

### 1.1 登录与注册

#### POST /api/auth/login
**描述：** 用户登录（支持密码和验证码两种方式）

**认证：** 否

**请求参数：**
```typescript
{
  phone_number: string;    // 手机号（11位）
  password?: string;        // 密码（Base64编码）
  verification_code?: string; // 验证码（6位数字）
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "登录成功",
  data: {
    token: string;          // JWT Token（7天有效期）
    phone_number: string;
    user_id: string;
    username: string;
  }
}
```

**特殊逻辑：**
- 密码和验证码二选一
- 验证码错误最多尝试5次，超过锁定15分钟
- 验证码有效期5分钟

---

#### POST /api/auth/register
**描述：** 用户注册

**认证：** 否

**请求参数：**
```typescript
{
  username: string;          // 用户名（1-50字符）
  phone_number: string;      // 手机号（11位）
  password: string;          // 密码（Base64编码，至少6位包含字母和数字）
  verification_code: string; // 短信验证码
  register_type?: string;    // 注册类型（默认phone）
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "注册成功",
  data: {
    token: string;
    phone_number: string;
    user_id: string;
    username: string;
    register_type: string;
  }
}
```

---

#### POST /api/auth/logout
**描述：** 用户登出

**认证：** 是

**响应格式：**
```typescript
{
  code: 200,
  message: "登出成功"
}
```

---

### 1.2 验证码管理

#### POST /api/auth/send-code
**描述：** 发送短信验证码

**认证：** 否

**请求参数：**
```typescript
{
  phone_number: string;  // 手机号
  type: string;          // 验证码类型：register | login | resetPassword
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "验证码已发送至您的手机"
}
```

**限制：**
- 1分钟内最多发送5次
- 临时用户（无密码）可以重新发送验证码

---

#### POST /api/auth/verify-code
**描述：** 验证短信验证码

**认证：** 否

**请求参数：**
```typescript
{
  phone_number: string;
  verification_code: string;
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "验证码正确",
  data: {
    user_id: string;
  }
}
```

---

### 1.3 密码管理

#### POST /api/auth/reset-pwd
**描述：** 重置密码

**认证：** 否

**请求参数：**
```typescript
{
  phone_number: string;
  password: string;          // 新密码（Base64编码）
  verification_code: string; // 验证码（有效期10分钟）
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "密码重置成功"
}
```

---

### 1.4 用户信息

#### GET /api/auth/check
**描述：** 检查认证状态

**认证：** 是

**响应格式：**
```typescript
{
  code: 200,
  message: "认证有效",
  data: {
    authenticated: true;
    userId: string;
    timestamp: string;
  }
}
```

---

#### POST /api/auth/check-phone
**描述：** 检查手机号是否已注册

**认证：** 否

**请求参数：**
```typescript
{
  phone_number: string;
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "查询成功",
  data: {
    exists: boolean;
  }
}
```

---

#### GET /api/auth/info
**描述：** 获取用户信息

**认证：** 是

**响应格式：**
```typescript
{
  code: 200,
  message: "获取成功",
  data: {
    user_id: string;
    nickname: string;
    email: string;
    phone_number: string;
    avatar: string;
    company_name: string;
    create_time: Date;
  }
}
```

---

#### PATCH /api/auth/info
**描述：** 更新用户资料

**认证：** 是

**请求参数：**
```typescript
{
  nickname?: string;  // 昵称（2-50字符）
  email?: string;     // 邮箱（可选）
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "更新成功",
  data: {
    user_id: string;
    nickname: string;
    email: string;
    phone_number: string;
    avatar: string;
  }
}
```

---

## 二、对话管理模块

### 2.1 会话管理

#### POST /api/chat/conversations
**描述：** 创建新会话

**认证：** 是

**请求参数：**
```typescript
{
  title?: string;               // 对话标题（0-255字符）
  model?: string;               // AI模型（默认LLM_MODEL）
  is_deep_think?: boolean;      // 是否深度思考
  context_window?: number;      // 上下文窗口（默认10）
  max_tokens?: number;          // 最大token数
  conversation_type?: string;   // 对话类型：general | paper_reading
  uploaded_paper_ids?: string[]; // 关联论文ID列表
  context_mode?: string;        // 上下文模式：auto | manual
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "会话创建成功",
  data: {
    conversation_id: string;
    user_id: string;
    title: string;
    model: string;
    is_deep_think: boolean;
    is_pinned: boolean;
    context_window: number;
    max_tokens: number;
    message_count: number;
    last_message_at: Date;
    create_time: Date;
    conversation_type: string;
    uploaded_paper_id: string;
    context_mode: string;
  }
}
```

---

#### GET /api/chat/conversations
**描述：** 获取会话列表

**认证：** 是

**请求参数：**
```typescript
{
  page?: number;              // 页码（默认1）
  limit?: number;             // 每页数量（默认20，最大100）
  search?: string;            // 搜索关键词
  conversation_type?: string;  // 筛选类型：general | paper_reading
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "获取成功",
  data: {
    items: Conversation[];
    total: number;
    page: number;
    size: number;
    has_more: boolean;
  }
}
```

---

#### GET /api/chat/conversations/[id]
**描述：** 获取会话详情

**认证：** 是

**响应格式：**
```typescript
{
  code: 200,
  message: "获取成功",
  data: {
    conversation_id: string;
    title: string;
    model: string;
    is_deep_think: boolean;
    is_pinned: boolean;
    context_window: number;
    max_tokens: number;
    message_count: number;
    create_time: Date;
    update_time: Date;
    conversation_type: string;
    uploaded_paper_id: string;
    context_mode: string;
    papers?: Paper[];  // 伴读对话返回关联论文
  }
}
```

---

#### PATCH /api/chat/conversations/[id]
**描述：** 更新会话

**认证：** 是

**请求参数：**
```typescript
{
  title?: string;
  is_pinned?: boolean;
  is_deep_think?: boolean;
  context_window?: number;
  max_tokens?: number;
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "更新成功",
  data: {
    conversation_id: string;
    title: string;
    is_pinned: boolean;
    update_time: Date;
  }
}
```

---

#### DELETE /api/chat/conversations/[id]
**描述：** 删除会话

**认证：** 是

**响应格式：**
```typescript
{
  code: 200,
  message: "删除成功"
}
```

---

### 2.2 消息管理

#### POST /api/chat/messages
**描述：** 发送消息（非流式）

**认证：** 是

**请求参数：**
```typescript
{
  conversation_id: string;
  content: string;              // 消息内容（1-50000字符）
  cited_paper_ids?: string[];   // 引用论文ID列表
  attachment_ids?: string[];    // 附件ID列表
  is_deep_think?: boolean;      // 是否深度思考
  auto_search_papers?: boolean; // 是否自动检索论文
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "发送成功",
  data: {
    user_message: {
      message_id: string;
      message_order: number;
      role: string;
      content: string;
      create_time: Date;
    };
    assistant_message: {
      message_id: string;
      message_order: number;
      role: string;
      content: string;
      input_tokens: number;
      output_tokens: number;
      total_tokens: number;
      create_time: Date;
    };
    conversation?: {
      title: string;
    };
    related_papers?: Paper[];  // 检索到的论文
  }
}
```

---

#### GET /api/chat/messages
**描述：** 获取消息列表

**认证：** 是

**请求参数：**
```typescript
{
  conversation_id: string;
  limit?: number;               // 每页数量（默认50，最大200）
  before_message_order?: number; // 分页游标
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "获取成功",
  data: {
    messages: Message[];
    has_more: boolean;
  }
}
```

---

#### POST /api/chat/messages/stream
**描述：** 流式发送消息（SSE）

**认证：** 是

**请求参数：**
```typescript
{
  conversation_id: string;
  content: string;
  cited_paper_ids?: string[];
  attachment_ids?: string[];
  is_deep_think?: boolean;
  auto_search_papers?: boolean;
  context_text?: string;        // 上下文文本（伴读模式）
  context_range?: string;       // 上下文范围（伴读模式）
  operation_type?: string;      // 操作类型（伴读模式）
  target_language?: string;     // 目标语言（翻译功能）
}
```

**SSE事件：**
- `start` - 开始生成
- `token` - 内容token
- `related_papers` - 检索到的论文
- `done` - 完成

---

#### GET /api/chat/messages/[id]
**描述：** 获取单个消息详情

**认证：** 是

**响应格式：**
```typescript
{
  code: 200,
  message: "获取成功",
  data: Message
}
```

---

#### PATCH /api/chat/messages/[id]
**描述：** 更新消息内容

**认证：** 是

**请求参数：**
```typescript
{
  content: string;  // 新内容（1-50000字符）
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "更新成功",
  data: Message
}
```

---

#### DELETE /api/chat/messages/[id]
**描述：** 删除消息

**认证：** 是

**响应格式：**
```typescript
{
  code: 200,
  message: "删除成功"
}
```

---

#### POST /api/chat/messages/[id]/regenerate
**描述：** 重新生成消息（流式）

**认证：** 是

**请求参数：**
```typescript
{
  is_deep_think?: boolean;
}
```

**SSE事件：** 与流式发送消息相同

---

#### GET /api/chat/messages/search
**描述：** 搜索消息

**认证：** 是

**请求参数：**
```typescript
{
  keyword: string;           // 搜索关键词（1-100字符）
  conversation_id?: string;  // 限定会话
  page?: number;             // 页码
  limit?: number;            // 每页数量
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "搜索成功",
  data: {
    items: Message[];
    total: number;
    page: number;
    size: number;
    has_more: boolean;
  }
}
```

---

### 2.3 消息反馈

#### POST /api/chat/feedback
**描述：** 提交消息反馈

**认证：** 是

**请求参数：**
```typescript
{
  message_id: string;
  feedback_type: string;     // like | dislike | cancel_like | cancel_dislike
  feedback_content?: string; // 反馈内容（可选）
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "点赞成功",
  data: {
    feedback_id: string;
    action: string;
  }
}
```

---

#### GET /api/chat/feedback/stats
**描述：** 获取反馈统计

**认证：** 是

**请求参数：**
```typescript
{
  conversation_id: string;  // 会话ID
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "获取成功",
  data: {
    total_count: number;
    like_count: number;
    dislike_count: number;
  }
}
```

---

### 2.4 引用管理

#### GET /api/chat/citations/format
**描述：** 格式化引用

**认证：** 是

**请求参数：**
```typescript
{
  paper_id: string;
  format?: string;  // APA | MLA | Chicago | IEEE | GB/T 7714（默认APA）
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "格式化成功",
  data: {
    format: string;
    formatted_text: string;
    download_formats: {
      bibtex: string;
      ris: string;
    };
  }
}
```

---

#### GET /api/chat/citations/download
**描述：** 下载引用文件

**认证：** 是

**请求参数：**
```typescript
{
  paper_id: string;
  format: string;  // BIBTEX | RIS
}
```

**响应：** 直接下载文件（.bib 或 .ris）

---

### 2.5 对话相关论文

#### GET /api/chat/conversations/[id]/related-papers
**描述：** 获取对话的相关论文（按消息分组）

**认证：** 是

**响应格式：**
```typescript
{
  code: 200,
  message: "获取成功",
  data: {
    conversation_id: string;
    total_papers: number;
    messages: {
      message_id: string;
      message_order: number;
      role: string;
      papers: Paper[];
    }[];
  }
}
```

---

#### POST /api/chat/conversations/[id]/message-versions
**描述：** 批量获取消息版本信息

**认证：** 是

**请求参数：**
```typescript
{
  message_ids: string[];  // 最多100条
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "获取成功",
  data: {
    [message_id: string]: {
      original_message: Message;
      regenerated_messages: Message[];
      total_versions: number;
    };
  }
}
```

---

## 三、知识库模块

### 3.1 文件夹管理

#### POST /api/folders
**描述：** 创建文件夹

**认证：** 是

**请求参数：**
```typescript
{
  folder_name: string;     // 文件夹名称（1-100字符）
  description?: string;    // 描述
  color?: string;          // 颜色
  cover_image?: string;    // 封面图路径（covers/开头）
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "文件夹创建成功",
  data: {
    folder_id: string;
    folder_name: string;
    description: string;
    color: string;
    cover_image: string;
    cover_image_url: string;
    sort_order: number;
    create_time: Date;
  }
}
```

---

#### GET /api/folders
**描述：** 获取文件夹列表

**认证：** 是

**响应格式：**
```typescript
{
  code: 200,
  message: "获取成功",
  data: {
    folders: Folder[];
  }
}
```

---

#### GET /api/folders/[id]
**描述：** 获取文件夹详情

**认证：** 是

**响应格式：**
```typescript
{
  code: 200,
  message: "获取成功",
  data: {
    folder_id: string;
    folder_name: string;
    description: string;
    color: string;
    cover_image: string;
    cover_image_url: string;
    sort_order: number;
    create_time: Date;
    update_time: Date;
  }
}
```

---

#### PATCH /api/folders/[id]
**描述：** 更新文件夹

**认证：** 是

**请求参数：**
```typescript
{
  folder_name?: string;
  description?: string;
  color?: string;
  cover_image?: string;
  sort_order?: number;
}
```

**响应格式：** 与获取详情相同

---

#### DELETE /api/folders/[id]
**描述：** 删除文件夹

**认证：** 是

**响应格式：**
```typescript
{
  code: 200,
  message: "删除成功"
}
```

---

### 3.2 文件夹内容管理

#### POST /api/folders/[id]/items
**描述：** 添加内容到文件夹（支持批量）

**认证：** 是

**单个添加请求参数：**
```typescript
{
  item_type?: string;  // uploaded_paper | conversation（默认uploaded_paper）
  item_id: string;
  notes?: string;      // 备注
}
```

**批量添加请求参数：**
```typescript
{
  items: {
    item_type: string;
    item_id: string;
  }[];
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "已加入到文件夹",
  data: {
    item_id: string;
    folder_id: string;
    item_type: string;
    content_id: string;
    added_at: Date;
  }
}
```

---

#### GET /api/folders/[id]/items
**描述：** 获取文件夹内所有内容

**认证：** 是

**请求参数：**
```typescript
{
  page?: number;
  limit?: number;
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "获取成功",
  data: {
    items: {
      item_id: string;
      item_type: string;
      content_id: string;
      uploaded_paper?: Paper;
      conversation?: Conversation;
      added_at: Date;
    }[];
    total: number;
    page: number;
    size: number;
  }
}
```

---

#### POST /api/folders/items/move
**描述：** 移动内容到另一个文件夹

**认证：** 是

**请求参数：**
```typescript
{
  item_ids: string | string[];  // FolderItem主键
  target_folder_id: string;
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "已移动 3 项",
  data: {
    moved_count: number;
    failed_count: number;
    errors: Array<{
      item_id: string;
      error: string;
    }>;
  }
}
```

---

#### POST /api/folders/items/remove
**描述：** 批量从文件夹移除内容

**认证：** 是

**请求参数：**
```typescript
{
  item_ids: string | string[];  // FolderItem主键
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "已移除 3 项",
  data: {
    removed_count: number;
    failed_count: number;
    errors: Array<{
      item_id: string;
      error: string;
    }>;
  }
}
```

---

#### GET /api/folders/items/status
**描述：** 批量查询内容的文件夹加入状态

**认证：** 是

**请求参数：**
```typescript
{
  item_ids: string;  // 逗号分隔的内容ID列表
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "查询成功",
  data: {
    [item_id: string]: {
      in_folder: boolean;
      folder_id?: string;
      folder_name?: string;
    };
  }
}
```

---

## 四、搜索模块

### 4.1 论文搜索

#### POST /api/search/papers
**描述：** 论文搜索（支持万方、本地数据库）

**认证：** 是

**请求参数：**
```typescript
{
  keyword: string;         // 搜索关键词（1-100字符）
  page?: number;           // 页码（默认1）
  page_size?: number;      // 每页数量（默认20，最大100）
  sort?: string;           // 排序方式（默认relevance）
  source?: string;         // 数据源：wanfang | wanfang_en | local（默认wanfang）
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "搜索成功",
  data: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    items: Paper[];
    source: string;
  }
}
```

---

#### POST /api/search/comprehensive
**描述：** 综合搜索（并发调用万方中文+外文）

**认证：** 是

**请求参数：**
```typescript
{
  keyword: string;
  page_size?: number;  // 每种来源的数量（默认5，最大20）
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "搜索成功",
  data: {
    keyword: string;
    papers_zh: {
      total: number;
      page: number;
      page_size: number;
      items: Paper[];
      source: "wanfang";
    };
    papers_en: {
      total: number;
      page: number;
      page_size: number;
      items: Paper[];
      source: "wanfang_en";
    };
  }
}
```

---

## 五、论文管理模块

### 5.1 论文详情

#### GET /api/papers/[id]
**描述：** 获取论文详情

**认证：** 是

**请求参数：**
```typescript
{
  id: string;              // 论文ID（UUID或dbId:an格式）
  includeFulltext?: string; // 是否包含全文（默认false）
  source?: string;         // 数据源：auto | local | ebsco（默认auto）
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "获取论文详情成功",
  data: {
    id: string;
    dbId: string;
    an: string;
    title: string;
    title_zh: string;
    titleFull: string;
    subtitle: string;
    authors: string[];
    authorsFull: string;
    publicationName: string;
    publicationType: string;
    publisher: string;
    publicationDate: string;
    publicationYear: number;
    volume: string;
    issue: string;
    startPage: string;
    pageCount: number;
    issn: string;
    isbn: string;
    doi: string;
    abstract: string;
    abstract_zh: string;
    abstractFull: string;
    subjects: string[];
    keywords: string[];
    language: string;
    documentType: string;
    sourceType: string;
    contentType: string;
    hasFulltext: boolean;
    fulltextAvailability: string;
    fulltextLink: string;
    pdfLink: string;
    pdfDownloaded: boolean;
    pdfFilePath: string;
    pdfFileSize: string;
    plink: string;
    customLinks: any[];
    relevancyScore: number;
    viewCount: number;
    downloadCount: number;
    syncTime: Date;
    source: string;
    fullText?: string;      // 如果includeFulltext=true
    recordInfo?: any;
  }
}
```

---

### 5.2 论文下载

#### GET /api/papers/[id]/download
**描述：** 下载论文PDF

**认证：** 是

**请求参数：**
```typescript
{
  id: string;
  preview?: string;  // 是否预览模式（默认false）
}
```

**响应：** 直接返回PDF文件流

**特殊逻辑：**
- 预览模式：`Content-Disposition: inline`
- 下载模式：`Content-Disposition: attachment`，增加下载计数

---

### 5.3 论文配置

#### GET /api/papers/config
**描述：** 获取EBSCO配置

**认证：** 是

**请求参数：**
```typescript
{
  type?: string;  // all | public | status
}
```

**响应格式：**
```typescript
// type=all
{
  code: 200,
  message: "获取配置成功",
  data: {
    sync: { ... };
    download: { ... };
  };
}

// type=status
{
  code: 200,
  message: "获取状态成功",
  data: {
    sync: {
      dailyCount: number;
      cron: string;
    };
    download: {
      dailyCount: number;
      rateLimit: number;
      cron: string;
    };
    cache: {
      sessions: { ... };
      sessionCount: number;
      tokens: { ... };
    };
  };
}
```

---

#### PUT /api/papers/config
**描述：** 批量更新EBSCO配置

**认证：** 是

**请求参数：**
```typescript
{
  updates: {
    configKey: string;
    configValue: any;
  }[];
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "更新配置成功",
  data: {
    total: number;
    successful: number;
    failed: number;
  }
}
```

---

### 5.4 论文同步

#### GET /api/papers/sync
**描述：** 获取同步日志

**认证：** 是

**请求参数：**
```typescript
{
  type?: string;   // wanfang_papers | wanfang_en_papers
  limit?: number;  // 每页数量（默认10）
  page?: number;   // 页码
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "获取同步日志成功",
  data: {
    logs: {
      id: string;
      syncType: string;
      status: string;
      startTime: Date;
      endTime: Date;
      duration: number;
      recordsProcessed: number;
      recordsSucceeded: number;
      recordsFailed: number;
      errorMessage: string;
    }[];
    total: number;
    page: number;
    size: number;
    total_pages: number;
  }
}
```

---

#### POST /api/papers/sync
**描述：** 手动触发同步任务

**认证：** 是

**请求参数：**
```typescript
{
  type: string;  // wanfang_papers | wanfang_en_papers
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "同步任务已触发",
  data: { ... }
}
```

---

#### GET /api/papers/sync/[id]
**描述：** 获取同步日志详情

**认证：** 是

**响应格式：**
```typescript
{
  code: 200,
  message: "获取日志详情成功",
  data: {
    id: string;
    syncType: string;
    status: string;
    startTime: Date;
    endTime: Date;
    duration: number;
    recordsProcessed: number;
    recordsSucceeded: number;
    recordsFailed: number;
    errorMessage: string;
    detail_log: any;  // JSON解析后的详细日志
  }
}
```

---

## 六、用户设置模块

### 6.1 账户管理

#### DELETE /api/user/account
**描述：** 删除账户（软删除）

**认证：** 是

**请求参数：**
```typescript
{
  confirmation: string;  // 必须为"DELETE"
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "账户已删除"
}
```

---

### 6.2 头像管理

#### GET /api/user/avatar
**描述：** 获取头像URL

**认证：** 是

**响应格式：**
```typescript
{
  code: 200,
  message: "获取成功",
  data: {
    avatar: string | null;
  }
}
```

---

### 6.3 通知管理

#### GET /api/user/notifications
**描述：** 获取通知列表

**认证：** 是

**请求参数：**
```typescript
{
  type?: string;    // 筛选类型：all | system | alert | reminder
  is_read?: string; // true | false
  page?: number;
  size?: number;
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "获取成功",
  data: {
    total: number;
    page: number;
    size: number;
    items: {
      id: string;
      user_id: string;
      notification_type: string;
      title: string;
      content: string;
      is_read: boolean;
      create_time: Date;
    }[];
  }
}
```

---

#### PATCH /api/user/notifications/[id]
**描述：** 标记单条通知为已读

**认证：** 是

**响应格式：**
```typescript
{
  code: 200,
  message: "标记成功"
}
```

---

#### PATCH /api/user/notifications/read-all
**描述：** 批量标记通知已读

**认证：** 是

**请求参数：**
```typescript
{
  type?: string;  // 可选：只标记指定类型
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "标记成功",
  data: {
    updated_count: number;
  }
}
```

---

#### GET /api/user/notifications/unread-count
**描述：** 获取未读通知数量

**认证：** 是

**响应格式：**
```typescript
{
  code: 200,
  message: "获取成功",
  data: {
    unread_count: number;
    by_type: {
      system: number;
      alert: number;
      reminder: number;
    };
  }
}
```

---

### 6.4 搜索历史

#### GET /api/user/search-history
**描述：** 获取搜索历史

**认证：** 是

**请求参数：**
```typescript
{
  type?: string;  // paper | comprehensive
  page?: number;
  size?: number;
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "获取成功",
  data: {
    total: number;
    items: {
      id: string;
      keyword: string;
      search_type: string;
      result_count: number;
      create_time: Date;
      paper_id: string;
    }[];
  }
}
```

---

#### DELETE /api/user/search-history
**描述：** 删除搜索历史

**认证：** 是

**请求参数：**
```typescript
{
  id?: string;         // 单条ID
  keyword?: string;    // 按关键词删除
  clear_all?: boolean; // 清空全部
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "删除成功"
}
```

---

## 七、AI功能模块

### 7.1 关键词生成

#### POST /api/ai/keywords
**描述：** AI生成关键词列表

**认证：** 是

**请求参数：**
```typescript
{
  keyword: string;  // 主题关键词（1-100字符）
  count?: number;  // 生成数量（默认10，最大20）
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "生成成功",
  data: {
    keyword: string;
    count: number;
    keywords: string[];
  }
}
```

---

### 7.2 问题生成

#### POST /api/ai/questions
**描述：** AI生成问题列表

**认证：** 是

**请求参数：**
```typescript
{
  keyword?: string;  // 主题关键词（可选，支持多个用、分隔）
  count?: number;   // 生成数量（默认5，最大10）
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "生成成功",
  data: {
    keyword: string;
    is_quick_mode: boolean;
    count: number;
    questions: string[];
  }
}
```

**特殊模式：**
- 快问快答模式：keyword为空时，随机选择内置关键词
- 多关键词模式：支持用、分隔多个关键词

---

## 八、配置管理模块

### 8.1 通用配置

#### GET /api/common-config
**描述：** 获取配置列表

**认证：** 是

**响应格式：**
```typescript
{
  code: 200,
  message: "获取成功",
  data: Config[]
}
```

---

#### GET /api/common-config/[key]
**描述：** 查询单个配置

**认证：** 是

**响应格式：**
```typescript
{
  code: 200,
  message: "获取成功",
  data: {
    config_key: string;
    config_value: any;
    description: string;
  }
}
```

---

#### PUT /api/common-config/[key]
**描述：** 更新配置

**认证：** 是

**请求参数：**
```typescript
{
  config_value: any;
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "更新成功"
}
```

---

## 九、文件上传模块

### 9.1 封面上传

#### POST /api/upload/cover
**描述：** 上传知识库封面图

**认证：** 是

**请求格式：** multipart/form-data

**请求参数：**
```typescript
{
  file: File;  // 图片文件（最大2MB）
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "上传成功",
  data: {
    file_path: string;   // covers/xxx.jpg
    file_url: string;    // /api/uploads/covers/xxx.jpg
    file_name: string;
    file_size: number;
  }
}
```

---

### 9.2 AI伴读论文上传

#### POST /api/ai-reading/papers
**描述：** 上传AI伴读论文

**认证：** 是

**请求格式：** multipart/form-data 或 application/json

**multipart/form-data参数：**
```typescript
{
  file: File;       // PDF文件（最大100MB）
  title?: string;
  authors?: string;
  abstract?: string;
  keywords?: string;
}
```

**application/json参数：**
```typescript
{
  cos_key: string;   // 已上传文件的路径
  file_name: string;
  file_size?: number;
  file_type?: string;
  title?: string;
  authors?: string;
  keywords?: string;
}
```

**响应格式：**
```typescript
{
  code: 200,
  message: "上传成功",
  data: {
    id: string;
    title: string;
    file_name: string;
    file_size: number;
    file_type: string;
    parse_status: string;
    cos_key: string;
  }
}
```

---

#### GET /api/uploaded-papers/[id]
**描述：** 获取用户上传论文详情

**认证：** 是

**响应格式：**
```typescript
{
  code: 200,
  message: "获取成功",
  data: {
    id: string;
    title: string;
    authors: string;
    abstract: string;
    keywords: string;
    year: number;
    source: string;
    publicationName: string;
    doi: string;
    file_path: string;
    file_name: string;
    file_size: number;
    file_type: string;
    mime_type: string;
    parse_status: string;
    parsed_content: string;
    created_at: Date;
    updated_at: Date;
    hasFulltext: boolean;
  }
}
```

---

### 9.3 静态文件访问

#### GET /api/uploads/[...path]
**描述：** 访问本地存储的文件

**认证：** 否

**路径参数：** 文件相对路径（如 papers/xxx.pdf, covers/xxx.jpg）

**响应：** 直接返回文件流

**支持的文件类型：**
- PDF
- 图片
- 文档

**缓存策略：** `Cache-Control: public, max-age=31536000, immutable`

---

## 十、健康检查模块

### 10.1 健康检查

#### GET /api/alive
**描述：** 服务健康检查

**认证：** 否

**响应格式：**
```typescript
200
```

---

## 附录A：标准响应格式

所有API接口遵循统一的响应格式：

### 成功响应
```typescript
{
  code: 200;
  message: string;
  data?: any;
}
```

### 错误响应
```typescript
// 501 - 服务器错误
{
  code: 501;
  message: string;
  data?: any;
}

// 503 - 业务错误（参数校验失败等）
{
  code: 503;
  message: string;
  data?: any;
}

// 401 - 未授权
{
  code: 401;
  message: string;
}

// 405 - 方法不允许
{
  code: 405;
  message: string;
}
```

---

## 附录B：认证机制

### JWT Token
- **签发位置：** 登录/注册成功后自动签发
- **有效期：** 7天
- **传递方式：** Authorization Header: `Bearer {token}`
- **自动续期：** 未实现，需要重新登录

### 认证中间件
```typescript
withAuth(handler)  // 强制要求认证
```

### 监控中间件
```typescript
withAuthMonitoring(handler, options)  // 需要认证的接口监控
withMonitoring(handler, options)      // 无需认证的接口监控
```

---

## 附录C：参数校验规则

### 字符串长度限制
| 参数 | 最小长度 | 最大长度 | 数据库字段 |
|------|----------|----------|-----------|
| 手机号 | 11 | 11 | VarChar(11) |
| 用户名 | 1 | 50 | VarChar(50) |
| 邮箱 | 5 | 100 | VarChar(100) |
| 搜索关键词 | 1 | 100 | VarChar(100) |
| 消息内容 | 1 | 50000 | LongText |
| 对话标题 | 0 | 255 | VarChar(255) |
| ID | 1 | 36 | VarChar(36) |
| 配置键名 | 1 | 100 | VarChar(100) |
| 论文ID | 1 | 100 | VarChar(36)或dbId:an |

### 分页参数
- **page：** 默认1，最小值1
- **size/limit：** 默认20，最大值100（可自定义）

---

## 附录D：错误码说明

| 错误码 | 说明 | 常见场景 |
|--------|------|----------|
| 200 | 成功 | 请求处理成功 |
| 401 | 未授权 | Token无效或过期 |
| 405 | 方法不允许 | HTTP方法不正确 |
| 501 | 服务器错误 | 数据库错误、第三方API调用失败 |
| 503 | 业务错误 | 参数校验失败、权限不足 |

---

## 附录E：接口调用统计

### 最活跃的模块
1. **对话管理** - 12个接口，核心功能模块
2. **知识库** - 8个接口，内容组织管理
3. **用户认证** - 10个接口，包含公开接口
4. **用户设置** - 8个接口，个人中心功能

### 需要认证的接口比例
- **需认证：** 48个（82.8%）
- **公开接口：** 10个（17.2%）

### 流式接口
- **POST /api/chat/messages/stream** - 流式发送消息
- **POST /api/chat/messages/[id]/regenerate** - 流式重新生成

---

## 附录F：注意事项

### 1. 参数命名规范
所有API入参和出参字段使用**下划线命名**（snake_case）：
- ✅ 正确：`conversation_id`, `is_deep_think`, `cited_paper_ids`
- ❌ 错误：`conversationId`, `isDeepThinking`, `citedPaperIds`

### 2. 中间件顺序
正确顺序：`withErrorHandler` → `withMonitoring` → `withAuth`

### 3. 数据库操作分离
- 禁止在API文件中直接操作数据库
- 所有数据库操作必须通过`src/db/`封装的函数

### 4. 监控类型选择
- `external_api`：调用第三方API（万方、OpenAI等）
- `business`：业务逻辑操作
- `none`：简单接口（仅依赖logRequest）

### 5. 文件上传限制
- 封面图：最大2MB
- 论文：最大100MB

---

**文档生成时间：** 2026-03-21
**项目版本：** Next.js 15.3.0 + TypeScript 5.0.2
**分析接口数量：** 58个
