# AI学术交互系统

## 项目概述

基于 Next.js 16 + TypeScript + Prisma + MySQL 的 AI 驱动学术交互系统，集成万方学术数据库和 DeepSeek AI 模型。

## 技术栈

- **前端**：Next.js 16、React 18、TypeScript 5.0
- **后端**：Next.js API Routes
- **数据库**：MySQL + Prisma ORM
- **认证**：JWT + bcrypt
- **AI**：OpenAI SDK (DeepSeek API)
- **UI**：Tailwind CSS + shadcn/ui

## 环境配置

### 1. 复制环境变量模板

```bash
cp .env.development.template .env.development
cp .env.production.template .env.production
```

### 2. 配置环境变量

**必须配置的变量**：

```bash
# 数据库
DATABASE_URL="mysql://user:password@localhost:3306/dbname"

# JWT
JWT_SECRET="your-secret-key"

# AI 模型
LLM_MODEL="deepseek-chat"
LLM_API_KEY="your-api-key"
LLM_API_URL="https://api.deepseek.com"
LLM_THINKING_MODEL="deepseek-reasoner"

# 腾讯云（短信验证码）
TENCENTCLOUD_SECRET_ID="your-secret-id"
TENCENTCLOUD_SECRET_KEY="your-secret-key"
TENCENTCLOUD_SMS_APP_ID="your-app-id"
TENCENTCLOUD_SMS_SIGN_NAME="your-sign-name"
TENCENTCLOUD_SMS_TEMPLATE_ID="your-template-id"

# 万方 API
WANFANG_API_BASE_URL="https://api.wanfangdata.com.cn/openwanfang"
WANFANG_APP_KEY="your-app-key"
WANFANG_APP_SECRET="your-app-secret"
```

## 开发指南

### 1. 安装依赖

```bash
pnpm install
```

### 2. 生成 Prisma Client

```bash
pnpm prisma generate
```

### 3. 运行开发服务器

```bash
pnpm dev

# 服务运行在 http://localhost:3007
```

### 4. 构建生产版本

```bash
pnpm build
```

### 5. 启动生产服务器

```bash
pnpm start
```

## 数据库迁移

**⚠️ 重要：禁止自动执行数据库迁移！**

修改 Prisma schema 后：

1. 生成 Prisma Client：
   ```bash
   pnpm prisma generate
   ```

2. 手动创建迁移 SQL（在 `prisma/migrations/` 目录下）

3. 提交 SQL 给数据库管理员审核

4. 手动在数据库中执行 SQL

**禁止使用**：
- ❌ `pnpm prisma migrate dev`
- ❌ `pnpm prisma db push`

## 日志系统

### 开发环境

- 日志目录：`./logs/`
- 控制台输出：✅ 显示

### 生产环境

- 日志目录：`/var/logs/lingang-library/`
- 创建日志目录：
  ```bash
  mkdir -p /var/logs/lingang-library
  ```
- 控制台输出：❌ 不显示

日志文件：
- `error-YYYY-MM-DD.log` - 错误日志
- `combined-YYYY-MM-DD.log` - 综合日志

保留策略：14 天自动清理

## TypeScript 类型检查

开发过程中定期执行类型检查：

```bash
npx tsc --noEmit
```

## 代码规范

详见 [CLAUDE.md](./CLAUDE.md) 和 [docs/代码规范指南.md](./docs/代码规范指南.md)

## API 文档

API 接口文档位于 `docs/openapi/` 目录

## 项目结构

```
src/
├── components/         # React 组件
├── pages/             # Next.js 页面和 API
│   ├── api/          # API 路由
│   └── *.tsx         # 页面组件
├── db/               # 数据库操作层
├── service/          # 业务服务层
├── middleware/       # 中间件
├── utils/            # 工具函数
├── hooks/            # React Hooks
├── contexts/         # React Context
├── helper/           # 辅助函数
├── lib/              # 第三方库配置
├── constants/        # 常量定义
└── type/             # TypeScript 类型定义

prisma/
├── schema.prisma     # 数据库模型定义
└── migrations/       # 数据库迁移 SQL
```

## 常见问题

### 1. 端口冲突

默认端口：3007

如需修改，编辑 `package.json`：

```json
"dev": "next dev -p 3007",
"start": "next start -p 3007"
```

### 2. 数据库连接失败

检查：
- MySQL 服务是否启动
- DATABASE_URL 是否正确
- 数据库用户权限

### 3. Prisma Client 过期

修改 schema 后记得执行：

```bash
pnpm prisma generate
```

## 许可证

内部使用项目
