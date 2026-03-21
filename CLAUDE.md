# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository，每次输出必须使用中文。

## Project Overview

This is a Next.js 15 full-stack application template with TypeScript, Prisma ORM, MySQL database, and user authentication. The application uses Next.js Pages Router for both frontend and API routes.

## 📚 重要文档

在开始开发之前，请务必阅读以下文档：

- **[代码规范指南](docs/代码规范指南.md)** - 完整的项目代码规范，包括 API 开发、前端开发、数据库操作、命名规范等所有开发标准

所有开发人员必须严格遵守代码规范指南中的要求，以确保代码质量和项目可维护性。

## Code Style

### 代码注释规范

**禁止在代码注释中添加任何符号和表情**

- 错误示例: `// ✅ 正确逻辑`, `// ❌ 错误示例`, `// 🔧 修复`
- 正确示例: `// 正确逻辑`, `// 错误示例`, `// 修复`

代码注释应保持纯文本，避免使用任何符号（如 ✅、❌、🔧、⚠️ 等），以确保代码的可读性和跨平台兼容性。

### TypeScript 类型规范

**禁止使用 `any` 类型**

在所有 TypeScript 代码中，必须使用明确的类型定义，禁止使用 `any` 类型。

**规范说明：**

1. **变量声明**：必须使用具体类型或正确的泛型类型

   - 错误: `let data: any = null;`
   - 正确: `let data: UserData | null = null;`

2. **函数参数**：必须定义明确的参数类型

   - 错误: `function process(data: any) { ... }`
   - 正确: `function process(data: ProcessData) { ... }`

3. **API 响应**：必须定义完整的响应类型接口

   - 错误: `const response = await apiGet<any>('/api/users');`
   - 正确: `const response = await apiGet<UserListResponse>('/api/users');`

4. **状态管理**：useState 等 Hook 必须指定类型

   - 错误: `const [data, setData] = useState<any>(null);`
   - 正确: `const [data, setData] = useState<UserData | null>(null);`

5. **类型断言**：当需要类型转换时，使用 `as` 断言到具体类型
   - 错误: `const data = response.data as any;`
   - 正确: `const data = response.data as UserData;`

**例外情况：**

- 第三方库未提供类型定义且无法合理推断时，可使用 `unknown` 配合类型守卫
- 确实需要接受任意类型的泛型函数，使用泛型参数 `<T>` 而非 `any`

**违规检查：**

- [ ] 代码中无 `: any` 类型注解
- [ ] 代码中无 `as any` 类型断言
- [ ] useState/useRef 等 Hook 使用具体类型
- [ ] API 请求使用明确的响应类型

### Import 语句规范

**所有 import 语句必须写在文件顶部**

禁止在函数内部使用动态 import（`await import()`），所有模块导入必须在文件顶部完成。

**规范说明：**

1. **静态导入**：所有依赖必须在文件顶部通过静态 import 导入

   - 错误: 在函数内部使用 `const { foo } = await import("@/module")`
   - 正确: 在文件顶部使用 `import { foo } from "@/module"`

2. **动态 import 的问题**：
   - 降低代码可读性
   - 类型推断不如静态 import 完善
   - 在服务端代码中没有实际的性能收益
   - 如果模块已被其他静态 import 引用，动态 import 没有延迟加载效果

**错误示例：**

```typescript
// 错误：在函数内部使用动态 import
const triggerParsing = async (id: string) => {
  const { updateStatus } = await import("@/db/paper");
  const { parseFile } = await import("@/service/parser");

  await updateStatus(id, "parsing");
  await parseFile(id);
};
```

**正确示例：**

```typescript
// 正确：在文件顶部静态导入
import { updateStatus } from "@/db/paper";
import { parseFile } from "@/service/parser";

const triggerParsing = async (id: string) => {
  await updateStatus(id, "parsing");
  await parseFile(id);
};
```

**例外情况：**

- 前端按需加载大型组件（Code Splitting）
- 条件性加载 polyfill
- 加载用户选择的主题/语言包

**违规检查：**

- [ ] 代码中无函数内部的 `await import()`
- [ ] 所有模块依赖在文件顶部声明

### 分页参数规范

**所有 API 接口的分页参数必须使用统一的命名和解析方式**

#### 1. 入参规范

使用 `src/utils/parsePageParams.ts` 提供的工具函数解析分页参数，禁止手动使用 `parseInt` 或 `Number` 解析。

**标准入参命名：**

| 参数名 | 说明     | 默认值 |
| ------ | -------- | ------ |
| `page` | 页码     | 1      |
| `size` | 每页数量 | 20     |

**工具函数说明：**

```typescript
import { parsePageNumber, parseLimitParam } from "@/utils/parsePageParams";

// parsePageNumber - 解析页码参数
// 默认值: 1，最小值: 1
parsePageNumber(page);

// parseLimitParam - 解析每页数量参数
// 默认值: 20，最大值: 100
parseLimitParam(size); // 使用默认值 (20, 100)
parseLimitParam(size, 10); // 自定义默认值 10，最大值 100
```

#### 2. 出参规范

**标准出参命名（snake_case）：**

| 参数名  | 类型   | 说明     |
| ------- | ------ | -------- |
| `total` | number | 总记录数 |
| `page`  | number | 当前页码 |
| `size`  | number | 每页数量 |
| `items` | array  | 数据列表 |

**标准返回格式：**

```typescript
return sendSuccessResponse(res, "获取成功", {
  total: result.total,
  page: pageNum,
  size: sizeNum,
  items: result.data,
});
```

#### 3. 完整示例

**正确示例：**

```typescript
import { parsePageNumber, parseLimitParam } from "@/utils/parsePageParams";

const handleGet = async (req: NextApiRequest, res: NextApiResponse) => {
  const { page, size } = req.query;

  // 标准分页（默认 20 条/页，最大 100 条）
  const pageNum = parsePageNumber(page);
  const sizeNum = parseLimitParam(size);

  // 自定义默认值（如搜索接口默认 10 条）
  const sizeNum = parseLimitParam(size, 10); // 默认 10，最大 100

  const result = await getData({ page: pageNum, size: sizeNum });
};
```

**错误示例：**

```typescript
// 错误：手动使用 parseInt
const pageNum = parseInt(page as string) || 1;
const sizeNum = Math.min(100, Math.max(1, parseInt(size as string) || 20));

// 错误：使用 Number 转换
const sizeNum = Math.min(20, Math.max(1, Number(size)));

// 错误：三元表达式解析
const pageNum = page ? parseInt(page as string) : 1;
```

#### 4. 违规检查

**入参检查：**

- [ ] API 文件中无 `parseInt(page` 或 `parseInt(size` 的手动解析
- [ ] API 文件中无 `Math.max(1, Number(page))` 或类似的手动解析
- [ ] API 文件中无 `Math.min(100, Math.max(1, Number(size)))` 的组合解析
- [ ] 所有分页参数使用 `parsePageNumber` 和 `parseLimitParam`
- [ ] `parseLimitParam` 使用默认值时省略冗余参数（如 `parseLimitParam(size)` 而非 `parseLimitParam(size, 20, 100)`）

**出参检查：**

- [ ] 返回字段使用 `total`、`page`、`size`、`items` 标准命名
- [ ] 禁止使用 `pageSize`、`totalPages`（驼峰）或 `limit`（非标准命名）

### 字符串长度校验规范

**所有 API 接口的用户输入参数必须进行字符串长度校验**

#### 1. 校验工具

使用 `src/utils/validateString.ts` 提供的工具函数进行校验，禁止手动编写长度判断逻辑。

**核心函数：**

```typescript
import { validateString, validateId, validatePhone, validateEmail } from "@/utils/validateString";

// validateString - 通用字符串校验
validateString(value, "字段名", { limitKey: "keyword" });
validateString(value, "字段名", { min: 1, max: 100 });
validateString(value, "字段名", { limitKey: "keyword", required: false });

// validateId - ID 校验（UUID 或普通 ID）
validateId(id, "消息 ID");
validateId(id, "会话 ID", false); // 非必填

// validatePhone - 手机号校验（格式 + 长度）
validatePhone(phone, "手机号");

// validateEmail - 邮箱校验（格式 + 长度）
validateEmail(email, "邮箱", false); // 非必填
```

#### 2. STRING_LIMITS 预设配置

所有长度限制必须小于等于数据库对应字段的长度，配置位于 `src/utils/validateString.ts`：

| limitKey | min | max | 说明 | 数据库字段 |
|----------|-----|-----|------|-----------|
| `phone` | 11 | 11 | 手机号 | VarChar(11) |
| `nickname` | 1 | 50 | 昵称 | VarChar(50) |
| `email` | 5 | 100 | 邮箱 | VarChar(100) |
| `keyword` | 1 | 100 | 搜索关键词 | VarChar(100) |
| `message_content` | 1 | 50000 | 消息内容 | LongText |
| `conversation_title` | 0 | 255 | 对话标题 | VarChar(255) |
| `id` | 1 | 36 | UUID | VarChar(36) |
| `config_key` | 1 | 100 | 配置键名 | VarChar(100) |
| `paper_id` | 1 | 100 | 论文 ID | VarChar(36) 或 dbId:an |

完整配置请参考 `src/utils/validateString.ts` 中的 `STRING_LIMITS` 对象。

#### 3. 使用示例

**正确示例：**

```typescript
import { validateString, validateId } from "@/utils/validateString";

const handler = async (req: NextApiRequest, res: NextApiResponse, userId: string) => {
  const { id } = req.query;
  const { keyword, title } = req.body;

  // ID 校验
  const idResult = validateId(id, "消息 ID");
  if (!idResult.valid) {
    return sendWarnningResponse(res, idResult.error || "消息 ID 校验失败");
  }

  // 关键词校验（使用预设 limitKey）
  const keywordResult = validateString(keyword, "关键词", { limitKey: "keyword" });
  if (!keywordResult.valid) {
    return sendWarnningResponse(res, keywordResult.error || "关键词校验失败");
  }

  // 标题校验（非必填）
  const titleResult = validateString(title, "标题", { limitKey: "conversation_title", required: false });
  if (!titleResult.valid) {
    return sendWarnningResponse(res, titleResult.error || "标题校验失败");
  }

  // 校验通过后使用类型断言
  const messageId = id as string;
  // ...
};
```

**错误示例：**

```typescript
// 错误：手动判断长度
if (!keyword || keyword.length > 100) {
  return sendWarnningResponse(res, "关键词不合法");
}

// 错误：缺少长度校验
if (!id || typeof id !== "string") {
  return sendWarnningResponse(res, "缺少ID");
}

// 错误：硬编码长度超过数据库限制
validateString(value, "昵称", { max: 200 }); // 数据库只有 VarChar(50)
```

#### 4. 添加新的 limitKey

当需要为新字段添加长度限制时：

1. **查看数据库 schema**：确认 `prisma/schema.prisma` 中对应字段的类型和长度
2. **添加配置**：在 `STRING_LIMITS` 中添加新条目，max 值不能超过数据库字段长度
3. **添加注释**：说明对应的数据库字段类型

```typescript
// 示例：添加新的 limitKey
export const STRING_LIMITS = {
  // ...
  new_field: { min: 1, max: 100 }, // 新字段 (db: VarChar(100))
} as const;
```

#### 5. 违规检查

- [ ] API 文件中无 `!value || typeof value !== "string"` 的手动类型检查
- [ ] API 文件中无 `value.length > xxx` 的手动长度判断
- [ ] 所有用户输入参数使用 `validateString` 或 `validateId` 校验
- [ ] `limitKey` 或自定义 `max` 值不超过数据库字段长度
- [ ] 校验通过后使用 `as string` 类型断言

## Development Commands

### Setup

```bash
# Install dependencies
pnpm i

# Generate Prisma client (required after installing dependencies or schema changes)
pnpm prisma generate
```

### Development

```bash
# Run development server on port 3007
pnpm dev

# Build for production
pnpm build

# Start production server on port 3007
pnpm start

# Lint code
pnpm lint

# TypeScript type checking (required after each development task)
npx tsc --noEmit
```

### Database

```bash
# Generate Prisma client
pnpm prisma generate

# Run Prisma Studio (database GUI)
pnpm prisma studio

# Other Prisma commands
pnpm prisma [command]
```

#### ⚠️ 数据库迁移规范

**CRITICAL: 禁止自动执行数据库迁移！**

当修改 Prisma schema 后，必须按照以下流程操作：

1. **修改 schema**：在 `prisma/schema.prisma` 中修改模型定义
2. **生成 Prisma Client**：
   ```bash
   pnpm prisma generate
   ```
3. **创建迁移 SQL**：

   - 在 `prisma/migrations/` 目录下创建新的迁移文件夹（格式：`YYYYMMDDHHMMSS_描述`）
   - 在文件夹中创建 `migration.sql` 文件，编写 SQL 语句
   - **禁止使用 `pnpm prisma migrate dev`**
   - **禁止使用 `pnpm prisma db push`**

4. **提交 SQL 给用户**：
   - 将 SQL 文件路径告知用户
   - 用户手动审核后在数据库中执行

**示例迁移 SQL：**

```sql
-- 文件：prisma/migrations/20251123225510_add_reasoning_fields_to_bill/migration.sql

-- AlterTable
ALTER TABLE `bills`
  ADD COLUMN `reasoning_content` TEXT NULL COMMENT 'DeepSeek-R1 思考过程内容',
  ADD COLUMN `reasoning_tokens` INT NULL DEFAULT 0 COMMENT '思考过程消耗的 tokens';
```

**迁移文件命名规范：**

- 格式：`YYYYMMDDHHMMSS_操作描述`
- 示例：`20251123225510_add_reasoning_fields_to_bill`
- 描述使用蛇形命名法（snake_case）

**安全检查清单：**

- [ ] SQL 语句已创建在 `prisma/migrations/` 目录
- [ ] 已执行 `pnpm prisma generate` 生成类型
- [ ] 已告知用户 SQL 文件路径
- [ ] **未执行** `prisma migrate dev` 或 `prisma db push`

## Development Workflow

### 开发最佳实践

1. **小步快跑** - 每完成一个小模块就执行一次 TypeScript 检查
2. **及时修复** - 发现错误立即修复，不要累积问题
3. **增量验证** - 不要等到所有代码都写完才进行 TypeScript 检查，应该边写边验证
4. **记录日志** - TypeScript 检查失败时记录错误信息，便于追溯和学习
5. **TypeScript 检查** - 每次开发完成任务后必须执行 `npx tsc --noEmit` 确保项目类型安全

## Architecture

### Directory Structure

- `src/pages/` - Next.js pages and API routes (Pages Router)
  - `src/pages/api/` - API endpoints organized by feature
  - `src/pages/api/auth/` - Authentication endpoints (login, register, resetPwd, sendVerificationCode, etc.)
  - `src/pages/api/ai/` - AI-related endpoints
  - `src/pages/api/commonConfig/` - Configuration endpoints
- `src/components/` - React components
  - `src/components/ui/` - Reusable UI components (using shadcn/ui)
  - `src/components/auth/` - Authentication-related components
- `src/middleware/` - **中间件层** (Middleware Layer)
  - `src/middleware/auth/` - 认证中间件 (withAuth)
  - `src/middleware/monitoring/` - 监控中间件 (apiMonitor, withMonitoring, logRequest)
- `src/db/` - Database layer with Prisma queries organized by model (user.ts, bill.ts, commonConfig.ts)
- `src/utils/` - **纯工具函数** (Pure Utility Functions)
  - `src/utils/auth.ts` - JWT 和密码哈希工具
  - `src/utils/paginate.ts` - 分页工具
  - `src/utils/parsePageParams.ts` - 分页参数解析
  - `src/utils/getClientIp.ts` - 获取客户端 IP
  - `src/utils/prismaProxy.ts` - Prisma 数据库代理
- `src/service/` - **业务服务层** (Business Service Layer)
  - `src/service/notification/` - 通知服务 (email, sms, verification)
  - `src/service/chat/` - 聊天相关服务 (conversationUtils, llmService)
  - `src/service/aminer/` - AMiner API 服务
  - `src/service/ebsco/` - EBSCO API 服务
- `src/helper/` - Helper functions
  - `logger.ts` - Winston logger configuration
  - `responseHelper.ts` - Standardized API response functions
- `src/lib/` - **第三方库配置** (Third-party Library Configurations)
  - `src/lib/ai/` - AI 客户端配置 (OpenAI, DeepSeek)
  - `src/lib/axios.ts` - Axios 配置
- `src/constants/` - Application constants
- `src/type/` - TypeScript type definitions
- `src/styles/` - Global styles
- `prisma/` - Prisma schema and migrations

### Third-party API Documentation

本项目集成了以下第三方 API 服务，开发时需要查阅相关文档：

#### AMiner API

- **在线文档地址**: https://www.aminer.cn/open/docs?id=671a19a46e728a29db292f73
- **服务目录**: `src/service/aminer/`
- **使用说明**: 当需要查看 AMiner 相关接口文档时，使用 Playwright MCP server 工具访问上述 URL，并在页面上操作查找相关接口文档

#### EBSCO API

- **本地文档目录**: `EBSCO-API/`
- **服务目录**: `src/service/ebsco/`
- **使用说明**: EBSCO 相关的接口文档已存放在项目根目录的 `EBSCO-API` 文件夹中，直接读取对应文件即可

### Authentication System

- JWT-based authentication with bcrypt password hashing
- Token expiration: 7 days (configured in `src/constants/index.ts`)
- `withAuth` in `src/middleware/auth/withAuth.ts` handles API route protection
- User registration supports email or phone (controlled by `REGISTER_TYPE` constant)
- Verification codes sent via email (nodemailer) or printed to console (development mode)
- User status tracking: disabled_status, deleted_status, email_verified, phone_verified

### Database Layer Pattern

All database operations go through:

1. `src/utils/prismaProxy.ts` - Proxy wrapper that logs all Prisma operations
2. `src/db/[model].ts` - Model-specific database functions (e.g., `src/db/user.ts`)

Always use the proxied Prisma client from `src/utils/prismaProxy.ts` instead of creating new PrismaClient instances.

### API Response Pattern

Use standardized response helpers from `src/helper/responseHelper.ts`:

- `sendSuccessResponse(res, message, data)` - 200 status
- `sendErrorResponse(res, message, data)` - 501 status (logs error)
- `sendWarnningResponse(res, message, data)` - 503 status
- `sendUnauthorizedResponse(res, message)` - 401 status
- `sendMethodNotAllowedResponse(res, message)` - 405 status

### API Documentation Requirements

**⚠️ CRITICAL: 当涉及 API 接口的新增、删除或修改时，必须同步更新 OpenAPI 文档！**

API 文档位于 `docs/openapi/` 目录，按功能模块分组

**文档更新规则:**

1. **新增接口**: 必须在对应的分组文档中（或新增分组）添加完整的接口定义，包括：

   - 路径、HTTP 方法、描述
   - 请求参数（path/query/body）
   - 响应格式（成功/失败）
   - 安全认证要求

2. **修改接口**: 当请求参数或响应格式发生变化时：

   - 更新 `requestBody` 或 `parameters` 定义
   - 更新 `responses` schema
   - 更新描述说明

3. **删除接口**: 从对应文档中移除接口定义

4. **文档格式**: 遵循 OpenAPI 3.0.3 规范

**示例 - 新增接口:**

```json
"/api/chat/messages/{id}": {
  "get": {
    "tags": ["消息管理"],
    "summary": "获取单个消息详情",
    "description": "根据消息 ID 获取消息的完整信息",
    "operationId": "getMessageById",
    "security": [{"bearerAuth": []}],
    "parameters": [
      {
        "name": "id",
        "in": "path",
        "required": true,
        "schema": {"type": "string", "format": "uuid"}
      }
    ],
    "responses": {
      "200": {
        "description": "获取成功",
        "content": {
          "application/json": {
            "schema": {"$ref": "#/components/schemas/MessageDetailResponse"}
          }
        }
      }
    }
  }
}
```

### Logging

Winston logger configured in `src/helper/logger.ts`:

- Production logs: `/var/logs/lingang-library/`
- Development logs: `./logs/`
- Daily log rotation (14 days retention, 20MB max size)
- Separate error.log and combined.log files
- Console output in development only

### Environment Configuration

Copy template files and configure:

- `.env.development.template` → `.env.development` (local development)
- `.env.production.template` → `.env.production` (production)

Required environment variables:

- `DATABASE_URL` - MySQL connection string
- `JWT_SECRET` - JWT signing secret
- `LLM_MODEL`, `LLM_API_KEY`, `LLM_API_URL` - AI model configuration

### Path Aliases

TypeScript path alias `@/*` maps to `src/*` for cleaner imports.

---

## Frontend HTTP Request Best Practices

### 统一 HTTP 请求封装

本项目提供了统一的 HTTP 请求封装（`src/api/request.ts`），确保前端 API 调用的一致性和可维护性。

#### 核心功能

- **自动认证**：自动添加 JWT Token 到请求头
- **统一错误处理**：自动处理 401 未授权、网络错误等
- **类型安全**：完整的 TypeScript 类型支持
- **拦截器**：请求/响应拦截器用于日志和错误处理

#### 标准 API 方法

**⚠️ IMPORTANT: 所有 HTTP 请求方法使用 `api` 前缀，避免命名冲突**

```typescript
import { apiGet, apiPost, apiPut, apiDel } from "@/api/request";

// GET 请求
const response = await apiGet<UserData>("/api/user/profile");

// POST 请求（带数据）
const response = await apiPost<LoginResponse>("/api/auth/login", {
  phone: "13800138000",
  password: "password123",
});

// PUT 请求（更新数据）
const response = await apiPut<UpdateResponse>("/api/user/profile", {
  nickname: "新昵称",
});

// DELETE 请求
const response = await apiDel<DeleteResponse>("/api/user/favorites/123");
```

#### 响应格式

所有 API 响应遵循统一格式（与后端 `responseHelper` 保持一致）：

```typescript
interface ApiResponse<T = any> {
  code: number; // HTTP 状态码：200 成功，其他失败
  message: string; // 提示信息
  data: T; // 响应数据
}
```

#### 自动 401 回调机制

当用户的 Token 过期或无效时，系统会自动：

1. **清除本地 Token**
2. **携带当前页面 URL** 跳转到登录页
3. 用户登录成功后**自动返回原页面**

**实现原理：**

```typescript
// 401 处理自动添加 redirect 参数
// 例如：用户在 /chat?id=123 页面请求失败
// 会自动跳转到：/login?redirect=%2Fchat%3Fid%3D123

// 登录成功后，前端读取 redirect 参数跳转回原页面
const { redirect } = router.query;
if (redirect && typeof redirect === "string") {
  router.push(redirect);
}
```

**注意事项：**

- 登录页需要实现 `redirect` 参数的读取和跳转逻辑

#### 请求配置

支持自定义请求配置：

```typescript
// 自定义超时时间
await apiGet("/api/long-running-task", {
  timeout: 60000, // 60秒
});

// 自定义请求头
await apiPost("/api/upload", data, {
  headers: {
    "Content-Type": "multipart/form-data",
  },
});
```

#### 错误处理

封装会自动处理常见错误：

- **401 未授权**：自动清除 Token 并跳转到登录页（携带回调参数）
- **403 无权限**：提示"没有权限访问"
- **404 不存在**：提示"请求的资源不存在"
- **500+ 服务器错误**：提示"服务器错误"
- **网络错误**：提示"网络错误，请检查网络连接"

业务代码中只需处理特定的业务逻辑错误：

```typescript
try {
  const response = await apiPost("/api/auth/login", formData);

  // 成功处理（code === 200）
  console.log("登录成功:", response.data);
} catch (error: any) {
  // 错误已被统一处理，这里只需显示错误信息
  setError(error.message || "登录失败");
}
```

#### 开发规范

**推荐做法 ✅：**

1. **统一使用封装方法**：新代码优先使用 `apiGet`/`apiPost`/`apiPut`/`apiDel`
2. **类型安全**：始终为响应数据定义 TypeScript 类型
3. **错误处理**：使用 try-catch 捕获错误并显示给用户

**不推荐做法 ❌：**

1. **直接使用 axios、fetch**：避免在组件中直接 `import axios`（除非有特殊需求）
2. **忽略类型定义**：不使用 `any` 作为响应类型
3. **重复实现认证逻辑**：不在组件中手动添加 Authorization 头

#### 特殊场景

如需直接使用 fetch 实例（如 SSE 流式响应、上传文件）：

```typescript
// 流式响应
const controller = new AbortController();

const response = await fetch("/api/chat/messages/stream", {
  method: "POST",
  signal: controller.signal,
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    conversation_id: "uuid",
    content: "你好",
  }),
});

// 中断生成
controller.abort();
```

---

## API Development Best Practices

### 标准 API 接口模板

本项目采用统一的 API 开发模式，确保代码质量、可维护性和监控完整性。

#### 核心原则

1. **强制鉴权**：所有搜索和详情接口必须使用 `withAuth`
2. **零侵入监控**：使用 `withMonitoring` 或 `withAuthMonitoring` 包装 handler
3. **请求方式判断**：在最外层统一判断 HTTP 方法
4. **标准化响应**：使用 `responseHelper` 的标准函数
5. **完整日志**：使用 `logRequest` 记录所有请求
6. **数据库操作分离**：禁止在 API 接口文件中直接操作数据库

#### 数据库操作分离原则

**⚠️ CRITICAL: 禁止在 API 接口文件中直接进行数据库操作！**

所有数据库操作必须通过 `src/db/` 目录下的专用函数进行，确保代码分层清晰、可测试、可维护。

**规范说明：**

1. **API 层职责**（`src/pages/api/`）：

   - ✅ 参数验证
   - ✅ 调用 service 层或 db 层函数
   - ✅ 返回标准化响应
   - ❌ 不应包含任何 `prisma.xxx.findMany()` 等数据库操作

2. **数据库层职责**（`src/db/`）：

   - ✅ 封装所有 Prisma 数据库操作
   - ✅ 提供类型安全的函数接口
   - ✅ 处理数据库事务和错误

3. **Service 层职责**（`src/service/`）：
   - ✅ 调用第三方 API
   - ✅ 业务逻辑编排
   - ✅ 数据格式转换

**错误示例 ❌：**

```typescript
// src/pages/api/search/papers.ts
const handler = async (req, res, userId) => {
  // ❌ 直接在 API 中操作数据库
  const dbPapers = await prisma.paper.findMany({
    where: { source: "aminer" },
  });

  const favoriteMap = await prisma.favorite.findMany({
    where: { user_id: userId },
  });
};
```

**正确示例 ✅：**

```typescript
// src/db/aminer/paper.ts
export async function findPapersBySource(source: string) {
  return await prisma.paper.findMany({
    where: { source },
  });
}

// src/db/aminer/favorite.ts
export async function batchCheckFavorites(params: {
  user_id: string;
  favorite_type: string;
  item_ids: string[];
}): Promise<Record<string, boolean>> {
  // ... 数据库操作
}

// src/pages/api/search/papers.ts
const handler = async (req, res, userId) => {
  // ✅ 调用 db 层封装的函数
  const dbPapers = await findPapersBySource("aminer");
  const favoriteMap = await batchCheckFavorites({
    user_id: userId,
    favorite_type: "paper",
    item_ids: paperIds,
  });
};
```

**违规检查：**

在 Code Review 时，确保：

- [ ] API 文件中无 `prisma.xxx.create()`
- [ ] API 文件中无 `prisma.xxx.findMany()`
- [ ] API 文件中无 `prisma.xxx.update()`
- [ ] API 文件中无 `prisma.xxx.delete()`
- [ ] 所有数据库操作已封装到 `src/db/` 函数中

---

#### API 参数命名规范

**⚠️ CRITICAL: 所有 API 入参必须采用下划线形式命名（snake_case）**

**规范说明：**

1. **请求参数命名**：所有从客户端传入的参数使用下划线命名

   - ✅ **正确**: `conversation_id`, `deep_thinking`, `cited_paper_ids`, `search_type`
   - ❌ **错误**: `conversationId`, `deepThinking`, `citedPaperIds`, `searchType`

2. **响应字段命名**：返回给客户端的数据字段也应使用下划线命名

   - ✅ **正确**: `user_id`, `create_time`, `is_favorited`, `paper_id`
   - ❌ **错误**: `userId`, `createdAt`, `isFavorited`, `paperId`

3. **数据库字段映射**：与 Prisma 数据库字段命名保持一致
   - Prisma schema 使用下划线命名，API 参数应直接对应

**示例对比：**

```typescript
// ❌ 错误：驼峰命名
const { conversationId, deepThinking, citedPaperIds } = req.body;

// ✅ 正确：下划线命名
const { conversation_id, deep_thinking, cited_paper_ids } = req.body;
```

**特殊场景：**

- **环境变量**：使用全大写 + 下划线，如 `LLM_MODEL`, `LLM_THINKING_MODEL`, `DATABASE_URL`
- **TypeScript 类型定义**：接口字段使用下划线命名，保持与 API 一致
- **前端传参**：前端发送请求时也应使用下划线命名，确保前后端一致

---

### 示例 1：带鉴权的搜索接口（推荐）

**场景**：用户搜索论文，需要登录，返回收藏状态和搜索历史

```typescript
// 文件：src/pages/api/search/papers.ts
import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withAuthMonitoring } from "@/utils/withMonitoring";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { searchPapersPro } from "@/service/aminer/paper";
import { batchUpsertPapers } from "@/db/aminer/paper";
import { createSearchHistory } from "@/db/aminer/searchHistory";
import { batchCheckFavorites } from "@/db/aminer/favorite";
import logRequest from "@/utils/logRequest";

/**
 * 论文搜索 API
 * POST /api/search/papers
 *
 * @requires Authentication - 需要用户登录
 * @param keyword - 搜索关键词
 * @param page - 页码（默认 1）
 * @param size - 每页数量（默认 10，最大 100）
 * @param searchType - 搜索类型：title/abstract/keyword
 * @returns 搜索结果列表，包含收藏状态
 */

// ✅ 步骤 1：编写纯粹的业务逻辑（无监控代码）
const handlePaperSearch = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string // userId 由 withAuth 提供
) => {
  logRequest(req, res);

  // 1. 参数验证
  const { keyword, page = 1, size = 10, searchType = "title" } = req.body;

  if (!keyword || keyword.trim() === "") {
    return sendWarnningResponse(res, "搜索关键词不能为空");
  }

  const pageNum = Math.max(1, Number(page));
  const sizeNum = Math.min(100, Math.max(1, Number(size)));

  // 2. 调用第三方 API
  const aminerResults = await searchPapersPro({
    keyword: keyword.trim(),
    page: pageNum - 1,
    size: sizeNum,
    searchType,
  });

  if (!aminerResults || aminerResults.length === 0) {
    return sendSuccessResponse(res, "未找到相关论文", {
      total: 0,
      page: pageNum,
      size: sizeNum,
      items: [],
    });
  }

  // 3. 缓存到数据库
  await batchUpsertPapers(aminerResults);

  // 4. 批量检查收藏状态（userId 必定存在，来自鉴权中间件）
  const paperIds = aminerResults.map((p) => p.id);
  const favoriteMap = await batchCheckFavorites({
    user_id: userId,
    favorite_type: "paper",
    item_ids: paperIds,
  });

  // 5. 记录搜索历史
  await createSearchHistory({
    user_id: userId,
    keyword: keyword.trim(),
    search_type: "paper",
    result_count: aminerResults[0]?.total || 0,
  });

  // 6. 格式化返回数据
  const items = aminerResults.map((paper) => ({
    ...paper,
    isFavorited: favoriteMap[paper.id] || false, // 必定有值
  }));

  return sendSuccessResponse(res, "搜索成功", {
    total: aminerResults[0]?.total || 0,
    page: pageNum,
    size: sizeNum,
    items,
  });
};

// ✅ 步骤 2：请求方式判断（最外层）
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  try {
    if (req.method === "POST") {
      return await handlePaperSearch(req, res, userId);
    } else {
      return sendMethodNotAllowedResponse(res, "仅支持POST请求");
    }
  } catch (error) {
    console.error("论文搜索失败:", error);
    sendErrorResponse(res, "操作失败，请稍后再试", error);
  }
};

// ✅ 步骤 3：导出 - 鉴权 + 监控（配置独立在外层）
export default withAuth(
  withAuthMonitoring(handler, {
    monitorType: "external_api",
    apiProvider: "aminer",
    operationName: "searchPapersPro",
    extractMetadata: (req) => ({
      keyword: req.body.keyword,
      searchType: req.body.searchType,
      page: req.body.page,
    }),
    extractResultCount: (data) => data?.items?.length || 0,
    successMetric: "paper_search_success",
    failureMetric: "paper_search_failed",
  })
);
```

**代码优势**：

- ✅ 业务逻辑纯粹，无监控代码侵入
- ✅ 自动记录 API 调用成功/失败
- ✅ 自动记录业务指标
- ✅ userId 由中间件保证，无需判空
- ✅ 错误自动捕获和记录

---

### 示例 2：详情接口（带浏览历史）

**场景**：查看论文详情，需要登录，记录浏览历史

```typescript
// 文件：src/pages/api/aminer/papers/[id].ts
import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withAuthMonitoring } from "@/utils/withMonitoring";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { getPaperDetail } from "@/service/aminer/paper";
import { upsertPaper } from "@/db/aminer/paper";
import { createBrowseHistory } from "@/db/aminer/browseHistory";
import { checkFavorite } from "@/db/aminer/favorite";
import logRequest from "@/utils/logRequest";

/**
 * 论文详情 API
 * GET /api/aminer/papers/:id
 *
 * @requires Authentication - 需要用户登录
 * @param id - 论文 ID（路径参数）
 * @returns 论文详细信息，包含收藏状态
 */

const handleGetPaperDetail = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  logRequest(req, res);

  const { id } = req.query;

  // 验证参数
  if (!id || typeof id !== "string") {
    return sendWarnningResponse(res, "论文ID不能为空");
  }

  // 获取详情（尝试从数据库或 API）
  const paper = await getPaperDetail(id);

  if (!paper) {
    return sendWarnningResponse(res, "论文不存在");
  }

  // 存入数据库
  await upsertPaper(paper);

  // 检查收藏状态（userId 来自鉴权中间件）
  const isFavorited = await checkFavorite({
    user_id: userId,
    favorite_type: "paper",
    paper_id: paper.id,
  });

  // 记录浏览历史（强制记录）
  await createBrowseHistory({
    user_id: userId,
    browse_type: "paper",
    paper_id: paper.id,
  });

  return sendSuccessResponse(res, "获取成功", {
    ...paper,
    isFavorited,
  });
};

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  try {
    if (req.method === "GET") {
      return await handleGetPaperDetail(req, res, userId);
    } else {
      return sendMethodNotAllowedResponse(res, "仅支持GET请求");
    }
  } catch (error) {
    console.error("获取论文详情失败:", error);
    sendErrorResponse(res, "操作失败，请稍后再试", error);
  }
};

export default withAuth(
  withAuthMonitoring(handler, {
    monitorType: "external_api",
    apiProvider: "aminer",
    operationName: "getPaperDetail",
    extractMetadata: (req) => ({ paperId: req.query.id }),
    successMetric: "paper_detail_success",
    failureMetric: "paper_detail_failed",
  })
);
```

---

### 示例 3：多方法接口（GET/POST/DELETE）

**场景**：收藏管理，支持获取、添加、删除收藏

```typescript
// 文件：src/pages/api/user/favorites.ts
import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withAuthMonitoring } from "@/utils/withMonitoring";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import {
  getUserFavorites,
  addFavorite,
  removeFavorite,
} from "@/db/aminer/favorite";

/**
 * 收藏管理 API
 * GET    /api/user/favorites - 获取收藏列表
 * POST   /api/user/favorites - 添加收藏
 * DELETE /api/user/favorites - 删除收藏
 */

// ✅ 独立的处理函数
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { type, page = 1, size = 10 } = req.query;

  const favorites = await getUserFavorites({
    user_id: userId,
    favorite_type: type as string,
    page: Number(page),
    size: Number(size),
  });

  return sendSuccessResponse(res, "获取成功", favorites);
};

const handlePost = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { type, item_id } = req.body;

  if (!type || !item_id) {
    return sendWarnningResponse(res, "类型和ID不能为空");
  }

  await addFavorite({
    user_id: userId,
    favorite_type: type,
    item_id,
  });

  return sendSuccessResponse(res, "收藏成功");
};

const handleDelete = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { type, item_id } = req.body;

  if (!type || !item_id) {
    return sendWarnningResponse(res, "类型和ID不能为空");
  }

  await removeFavorite({
    user_id: userId,
    favorite_type: type,
    item_id,
  });

  return sendSuccessResponse(res, "取消成功");
};

// ✅ 最外层判断请求方式
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  try {
    if (req.method === "GET") {
      return await handleGet(req, res, userId);
    } else if (req.method === "POST") {
      return await handlePost(req, res, userId);
    } else if (req.method === "DELETE") {
      return await handleDelete(req, res, userId);
    } else {
      return sendMethodNotAllowedResponse(res, "仅支持GET、POST和DELETE请求");
    }
  } catch (error) {
    console.error("收藏管理操作失败:", error);
    sendErrorResponse(res, "操作失败，请稍后再试", error);
  }
};

export default withAuth(
  withAuthMonitoring(handler, {
    monitorType: "business",
    operationName: "manage_favorites",
    extractMetadata: (req) => ({
      method: req.method,
      type: req.body?.type || req.query?.type,
    }),
    successMetric: "favorites_operation_success",
    failureMetric: "favorites_operation_failed",
  })
);
```

---

### 监控类型说明

#### 1. `withAuthMonitoring` - 需要鉴权的接口

用于 `withAuth` 包装的接口，自动获取 `userId`。

```typescript
export default withAuth(
  withAuthMonitoring(handler, {
    monitorType: "external_api" | "business", // 监控类型
    apiProvider: "aminer" | "openai",         // 第三方 API 提供商
    operationName: "searchPapers",            // 操作名称
    extractMetadata: (req) => ({ ... }),     // 提取元数据
    successMetric: "paper_search_success",    // 成功指标
    failureMetric: "paper_search_failed",     // 失败指标
  })
);
```

#### 2. `withMonitoring` - 无需鉴权的接口

用于公开接口（如健康检查、公开统计）。

```typescript
export default withMonitoring(handler, {
  monitorType: "business",
  operationName: "health_check",
  successMetric: "health_check_success",
});
```

#### 3. 监控类型选择

| 监控类型       | 使用场景                               | 记录内容                     |
| -------------- | -------------------------------------- | ---------------------------- |
| `external_api` | 调用第三方 API（AMiner、OpenAI、微信） | API 响应时间、结果数量、错误 |
| `business`     | 业务逻辑操作（登录、注册、收藏）       | 操作结果、耗时、用户行为     |
| `none`         | 简单接口（仅依赖 logRequest）          | 仅记录基础请求日志           |

---

### 开发检查清单

开发新接口时，确保：

- [ ] 使用 `withAuth` 包装（搜索/详情接口必须）
- [ ] 使用 `withAuthMonitoring` 或 `withMonitoring` 添加监控
- [ ] 请求方式判断在最外层
- [ ] 使用 `responseHelper` 标准化响应
- [ ] 调用 `logRequest` 记录请求
- [ ] 参数验证完整（必填参数检查）
- [ ] 错误处理统一（自动捕获，无需手动 try-catch）
- [ ] 更新 OpenAPI 文档（`docs/openapi/`）

---

### 反模式（❌ 不推荐）

#### 反模式 1：监控代码侵入业务逻辑

```typescript
// ❌ 不推荐：业务逻辑中混杂监控代码
const handler = async (req, res) => {
  const monitor = new ExternalApiMonitor("aminer", "searchPapers", { ... });

  try {
    const results = await searchPapers(req.body.keyword);
    monitor.success(results.length);
    recordBusinessMetric("search_success", { ... });
    return sendSuccessResponse(res, "搜索成功", results);
  } catch (error) {
    monitor.failure(error);
    recordBusinessMetric("search_failed", { ... });
    return sendErrorResponse(res, "搜索失败", error);
  }
};

export default handler;
```

#### 反模式 2：请求方式在逻辑内部判断

```typescript
// ❌ 不推荐：在 try-catch 内部判断请求方式
export default withAuth(async (req, res, userId) => {
  try {
    if (req.method === "GET") {
      // GET 逻辑
    } else if (req.method === "POST") {
      // POST 逻辑
    } else {
      return res.status(405).json({ message: "Method not allowed" });
    }
  } catch (error) {
    // 错误处理
  }
});
```

#### 反模式 3：可选鉴权逻辑

```typescript
// ❌ 不推荐：手动解析 token，判断 userId 是否存在
const handler = async (req, res) => {
  let userId: string | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    try {
      const decoded = await verifyJWT(token);
      userId = decoded.userId;
    } catch (error) {
      console.warn("Token validation failed");
    }
  }

  if (userId) {
    // 记录历史
  }
};
```

**正确做法**：直接使用 `withAuth`，强制鉴权。

---

## Database Schema

Key models in `prisma/schema.prisma`:

- **User** - user_id (UUID primary key), username, phone_number (unique), hashed_password, verification_code, session_id, disabled/deleted status tracking, location fields (country, province, city, isp)
- **Bill** - Usage tracking for AI tokens (input_tokens, output_tokens, total_tokens, model, type)
- **commonConfig** - Application configuration key-value store

## Deployment

### Docker

- Multi-stage Dockerfile optimized for production
- Port: 3007 (internal), mapped to 30001 (host) in OneDev template
- Logs mounted: `/var/logs/lingang-library`
- Uses pnpm and Alpine Linux base image
- OneDev CI/CD configuration in `.onedev-buildspec.yml.template`

To deploy:

1. Update project name in `package.json`
2. Copy and configure `.onedev-buildspec.yml.template` → `.onedev-buildspec.yml`
3. Update tags, ports, branch names, and log directory
4. Modify `Dockerfile` port if needed
5. Configure environment variables

## Technology Stack

- **Framework**: Next.js 15.3.0 (Pages Router)
- **Language**: TypeScript 5.0.2
- **Database**: MySQL with Prisma ORM 4.11.0
- **Authentication**: JWT (jsonwebtoken) + bcrypt
- **Styling**: Tailwind CSS 3.3.5 with shadcn/ui components
- **Logging**: Winston with daily rotation
- **AI Integration**: OpenAI SDK 4.47.1
- **Email**: nodemailer
- **Verification Code**: Console output (development mode)
- **Package Manager**: pnpm
