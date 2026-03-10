# 前端登录注册 shadcn/ui 组件替换方案

> **生成时间**: 2025-01-25
> **最后更新**: 2025-11-26
> **目标**: 使用 shadcn/ui 组件库替代自定义组件，提升 UI 一致性和可维护性

---

## 目录

- [一、背景与目标](#一背景与目标)
- [二、当前状态分析](#二当前状态分析)
- [三、技术方案](#三技术方案)
- [四、风险评估与缓解措施](#四风险评估与缓解措施)
- [五、实施计划](#五实施计划)
- [六、测试验证](#六测试验证)
- [七、附录：完整代码示例](#七附录完整代码示例)

---

## 一、背景与目标

### 1.1 背景

当前登录注册页面使用大量内联 Tailwind 样式的原生 HTML 元素，存在以下问题：

1. **样式不统一**：每个按钮、输入框都需要手动编写样式
2. **维护成本高**：修改样式需要逐个组件调整
3. **可访问性不足**：缺乏 ARIA 属性支持
4. **代码重复**：相似的样式代码分散在多处

### 1.2 目标

1. 使用 shadcn/ui 统一组件库，提升 UI 一致性
2. 减少自定义样式代码，降低维护成本
3. 提升组件的可访问性和用户体验
4. 建立可复用的组件标准

### 1.3 开发规范

**能用 shadcn/ui 组件的，必须使用 shadcn/ui 组件实现。**

具体要求：

1. **按钮**：禁止使用原生 `<button>`，必须使用 `<Button>` 组件
2. **输入框**：禁止使用原生 `<input>`，必须使用 `<Input>` 组件
3. **复选框**：禁止使用原生 `<input type="checkbox">`，必须使用 `<Checkbox>` 组件
4. **Toast 提示**：禁止自定义 Toast 组件，必须使用 `sonner`
5. **表单标签**：配合输入框使用 `<Label>` 组件
6. **验证码输入**：使用 `<InputOTP>` 组件

**代码审查检查点**：

- [ ] 无原生 `<button>` 元素（除非有特殊需求并注释说明）
- [ ] 无原生 `<input>` 元素（除非有特殊需求并注释说明）
- [ ] 无自定义 Toast/Message 组件
- [ ] 所有表单使用 shadcn/ui 组件

---

## 二、当前状态分析

### 2.1 已安装的 shadcn 组件

项目已经配置了 shadcn/ui，并安装了以下组件：

```
src/components/ui/
├── button.tsx       # 按钮组件（已安装）
└── sonner.tsx       # Sonner Toast 组件（已安装）

依赖:
└── sonner: ^2.0.7   # Toast 库（已安装）
```

**shadcn 配置** (`components.json`):

- 样式风格: `new-york`
- TypeScript: 已启用
- CSS 变量: 已启用
- 图标库: `lucide-react`

### 2.2 当前自定义实现

登录注册页面中使用了大量内联样式的原生 HTML 元素：

```typescript
// 当前做法：内联 Tailwind 样式（不推荐）
<input
  type="tel"
  className="w-[360px] h-[40px] px-4 py-2 border border-[#C8C9CC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-blue-500 ..."
  placeholder="请输入手机号"
/>

<button
  className="w-[360px] h-[40px] bg-gradient-to-r from-[#9459FF] to-[#2E6EFF] text-white rounded-[10px] ..."
  disabled={loading}
>
  {loading ? "登录中..." : "即刻探索"}
</button>

{/* 自定义 Toast（不推荐） */}
{error && (
  <div className="fixed top-4 left-1/2 transform -translate-x-1/2 p-3 rounded-[10px] text-sm text-center bg-red-50 border border-red-200 text-red-600 z-50">
    {error}
  </div>
)}
```

---

## 三、技术方案

### 3.1 组件替换清单

| UI 元素      | 当前实现                       | shadcn 组件           | 优先级 | 难度 | 安装状态 |
| ------------ | ------------------------------ | --------------------- | ------ | ---- | -------- |
| 按钮         | 内联样式 `<button>`            | `Button`              | 高     | ��单 | 已安装   |
| 提示消息     | 自定义 `<div>`                 | `Sonner`              | 高     | 简单 | 已安装   |
| 输入框       | 内联样式 `<input>`             | `Input`               | 高     | 中等 | 需安装   |
| 复选框       | 原生 `<input type="checkbox">` | `Checkbox`            | 中     | 简单 | 需安装   |
| 验证码输入   | 自定义 6 个 `<input>`          | `InputOTP`            | 中     | 困难 | 需安装   |
| 表单         | 自定义 `<form>`                | `Form` (react-hook-form) | 低     | 困难 | 可选     |
| 标签         | 原生 `<label>`                 | `Label`               | 低     | 简单 | 需安装   |

### 3.2 安装配置步骤

#### 步骤 1: 安装必需组件

```bash
# 一次性安装所有组件
npx shadcn@latest add input checkbox label input-otp
```

#### 步骤 2: 配置 Sonner Toaster

修改 `src/pages/_app.tsx`:

```typescript
import { Toaster } from "sonner";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <UserProvider>
      <Component {...pageProps} />
      <Toaster richColors position="top-center" /> {/* 添加 Sonner Toaster */}
    </UserProvider>
  );
}

export default MyApp;
```

#### 步骤 3: (可选) 安装 Form 方案

```bash
npx shadcn@latest add form
pnpm add react-hook-form@^7.50.0 zod@^3.22.0 @hookform/resolvers@^3.3.0
```

### 3.3 详细替换方案

#### 3.3.1 替换按钮 (Button) - 已安装

**当前实现**:

```typescript
// LoginPage.tsx:704-714（不推荐）
<button
  type="submit"
  className="w-[360px] h-[40px] bg-gradient-to-r from-[#9459FF] to-[#2E6EFF] text-white rounded-[10px] shadow-[0px_10px_20px_0px_rgba(0,49,255,0.2)] hover:shadow-[0px_10px_20px_0px_rgba(0,49,255,0.3)] transition-all font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
  disabled={loading}
>
  {loading ? "登录中..." : "即刻探索"}
</button>
```

**优化后使用 shadcn Button**:

```typescript
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// 推荐写法
<Button
  type="submit"
  size="lg"
  disabled={loading}
  className="w-[360px] h-[40px] bg-gradient-to-r from-[#9459FF] to-[#2E6EFF] text-white rounded-[10px] shadow-[0px_10px_20px_0px_rgba(0,49,255,0.2)] hover:shadow-[0px_10px_20px_0px_rgba(0,49,255,0.3)] font-medium text-lg"
>
  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {loading ? "登录中..." : "即刻探索"}
</Button>
```

**优点**:

- 自动处理 `disabled` 状态样式
- 内置 `loading` 状态支持（可配合图标）
- 统一的 hover/focus 状态
- 支持 `asChild` 模式（配合 Next.js Link）

#### 3.3.2 替换提示消息 (Sonner) - 已安装

项目已安装 `sonner: ^2.0.7`，推荐使用 Sonner 替代自定义 Toast。

**当前实现**:

```typescript
// LoginPage.tsx:601-612（不推荐）
{error && (
  <div className="fixed top-4 left-1/2 transform -translate-x-1/2 p-3 rounded-[10px] text-sm text-center bg-red-50 border border-red-200 text-red-600 z-50">
    {error}
  </div>
)}

{success && (
  <div className="fixed top-4 left-1/2 transform -translate-x-1/2 p-3 rounded-[10px] text-sm text-center bg-green-50 border border-green-200 text-green-600 z-50">
    {success}
  </div>
)}
```

**优化后使用 Sonner**:

```typescript
// 推荐写法
import { toast } from "sonner";

export default function LoginPage() {
  // 删除这些状态
  // const [error, setError] = useState("");
  // const [success, setSuccess] = useState("");

  const handleLogin = async () => {
    try {
      const response = await apiPost(api.auth.login, data);

      // 显示成功提示
      toast.success("登录成功", {
        description: "正在跳转...",
      });

      handleLoginSuccess(response.data);
    } catch (error: any) {
      // 显示错误提示
      toast.error("登录失败", {
        description: error.message || "请稍后重试",
      });
    }
  };
}
```

**Sonner API 说明**:

```typescript
import { toast } from "sonner";

// 基础用法
toast("这是一条普通消息");

// 成功提示
toast.success("操作成功");

// 错误提示
toast.error("操作失败");

// 警告提示
toast.warning("请注意");

// 信息提示
toast.info("提示信息");

// 带描述的提示
toast.success("登录成功", {
  description: "正在跳转到首页...",
});

// 自定义持续时间（毫秒）
toast.success("保存成功", {
  duration: 3000,
});

// Promise 模式（自动显示 loading/success/error）
toast.promise(apiCall(), {
  loading: "正在提交...",
  success: "提交成功",
  error: "提交失败",
});
```

**优点**:

- API 简洁直观，无需 hook
- 自动管理显示/隐藏
- 自动堆叠多个提示
- 支持 Promise 模式
- 内置多种样式（success/error/warning/info）
- 优雅的动画效果
- 支持自定义持续时间

#### 3.3.3 替换输入框 (Input) - 需要安装

**安装命令**:

```bash
npx shadcn@latest add input
```

**当前实现**:

```typescript
// LoginPage.tsx:647-658（不推荐）
<input
  type="tel"
  name="phone_number"
  value={formData.phone_number}
  onChange={handleChange}
  className="w-[360px] h-[40px] px-4 py-2 border border-[#C8C9CC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-base bg-white mx-auto"
  placeholder="请输入手机号"
  required
  pattern="^1[3-9]\d{9}$"
  disabled={loading}
/>
```

**优化后使用 shadcn Input**:

```typescript
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// 推荐写法
<div className="space-y-2">
  <Label htmlFor="phone_number">手机号</Label>
  <Input
    id="phone_number"
    type="tel"
    name="phone_number"
    value={formData.phone_number}
    onChange={handleChange}
    placeholder="请输入手机号"
    disabled={loading}
    className={cn(
      "w-[360px] h-[40px]",
      errors.phone_number && "border-red-500 focus-visible:ring-red-500"
    )}
  />
  {errors.phone_number && (
    <p className="text-sm text-red-500">{errors.phone_number}</p>
  )}
</div>
```

**优点**:

- 统一的样式和行为
- 内置 focus 状态
- 支持 disabled 状态
- 支持错误状态（通过 className）
- 更好的可访问性（配合 Label）

#### 3.3.4 替换复选框 (Checkbox) - 需要安装

**安装命令**:

```bash
npx shadcn@latest add checkbox
npx shadcn@latest add label
```

**当前实现**:

```typescript
// LoginPage.tsx:804-819（不推荐）
<div className="flex items-center justify-center">
  <input
    type="checkbox"
    id="agreement"
    name="agreement"
    checked={is_agreement_checked}
    onChange={(e) => setIsAgreementChecked(e.target.checked)}
    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
    disabled={loading}
  />
  <label htmlFor="agreement" className="ml-2 font-['Source_Han_Sans_CN'] font-normal text-[16px] text-[#333333]">
    我已同意《使用协议》和《隐私协议》
  </label>
</div>
```

**优化后使用 shadcn Checkbox**:

```typescript
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// 推荐写法
<div className="flex items-center space-x-2">
  <Checkbox
    id="agreement"
    checked={is_agreement_checked}
    onCheckedChange={setIsAgreementChecked}
    disabled={loading}
  />
  <Label
    htmlFor="agreement"
    className="text-sm font-normal text-gray-700 cursor-pointer"
  >
    我已同意
    <button
      type="button"
      className="text-blue-500 hover:underline mx-1"
      onClick={() => {/* 显示协议弹窗 */}}
    >
      《使用协议》
    </button>
    和
    <button
      type="button"
      className="text-blue-500 hover:underline mx-1"
      onClick={() => {/* 显示隐私协议弹窗 */}}
    >
      《隐私协议》
    </button>
  </Label>
</div>
```

**优点**:

- 更美观的复选框样式
- 平滑的选中动画
- 更好的可访问性
- 支持 indeterminate 状态
- 与 Label 完美配合

#### 3.3.5 替换验证码输入框 (InputOTP) - 需要安装

**安装命令**:

```bash
npx shadcn@latest add input-otp
```

**当前实现**:

```typescript
// LoginPage.tsx:843-860 - 6个独立的 input（不推荐）
<div className="flex justify-center gap-2">
  {[0, 1, 2, 3, 4, 5].map((index) => (
    <input
      key={index}
      id={`verification-code-${index}`}
      type="text"
      maxLength={1}
      value={formData.verification_code[index] || ""}
      onChange={(e) => handleVerificationCodeChange(e, index)}
      className="w-[50px] h-[50px] text-center border border-[#C8C9CC] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xl font-bold bg-white"
      pattern="[0-9]*"
      inputMode="numeric"
      disabled={loading}
    />
  ))}
</div>
```

**优化后使用 shadcn InputOTP**:

```typescript
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

// 推荐写法
<InputOTP
  maxLength={6}
  value={formData.verification_code}
  onChange={(value) => setFormData({ ...formData, verification_code: value })}
  disabled={loading}
>
  <InputOTPGroup>
    <InputOTPSlot index={0} />
    <InputOTPSlot index={1} />
    <InputOTPSlot index={2} />
    <InputOTPSlot index={3} />
    <InputOTPSlot index={4} />
    <InputOTPSlot index={5} />
  </InputOTPGroup>
</InputOTP>
```

**优点**:

- 自动处理输入框切换
- 支持粘贴完整验证码
- 自动聚焦第一个输入框
- 更好的用户体验
- 内置验证和格式化

#### 3.3.6 使用表单方案 (Form + react-hook-form) - 可选

**安装命令**:

```bash
npx shadcn@latest add form
pnpm add react-hook-form@^7.50.0 zod@^3.22.0 @hookform/resolvers@^3.3.0
```

**优化后使用 react-hook-form + zod**:

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// 使用 zod 定义验证规则
const loginSchema = z.object({
  phone_number: z
    .string()
    .min(1, "请输入手机号")
    .regex(/^1[3-9]\d{9}$/, "请输入正确的11位手机号"),
  password: z
    .string()
    .min(6, "密码至少6位")
    .regex(/^(?=.*[A-Za-z])(?=.*\d)/, "密码必须包含字母和数字"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { toast } = useToast();
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone_number: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const response = await apiPost(api.auth.login, {
        phone_number: data.phone_number,
        password: btoa(data.password),
      });

      if (response.data.code !== 200) {
        toast({
          title: "登录失败",
          description: response.data.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "登录成功",
        description: "正在跳转...",
      });

      handleLoginSuccess(response.data.data);
    } catch (error: any) {
      toast({
        title: "登录失败",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* 手机号字段 */}
        <FormField
          control={form.control}
          name="phone_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>手机号</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder="请输入手机号"
                  {...field}
                />
              </FormControl>
              <FormMessage /> {/* 自动显示验证错误 */}
            </FormItem>
          )}
        />

        {/* 密码字段 */}
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>密码</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="请输入密码"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "登录中..." : "登录"}
        </Button>
      </form>
    </Form>
  );
}
```

**优点**:

- 声明式验证规则
- 自动显示错误信息
- 自动管理表单状态
- 支持异步验证
- 更好的类型安全

---

## 四、风险评估与缓解措施

### 4.1 潜在风险

| 风险 | 影响程度 | 发生概率 | 缓解措施 |
|------|----------|----------|----------|
| 样式冲突 | 中 | 中 | 通过 className 覆盖或修改 CSS 变量 |
| Bundle Size 增加 | 低 | 高 | shadcn 支持按需引入，影响可控 |
| 学习成本 | 低 | 中 | 文档完善，API 设计直观 |
| 迁移过程中的 Bug | 中 | 中 | 采用渐进式迁移，充分测试 |

### 4.2 风险详细说明

#### 4.2.1 样式冲突

- **风险描述**：shadcn 默认样式与现有设计稿不完全匹配
- **缓解措施**：
  1. 通过 className 属性覆盖默认样式
  2. 修改 `src/styles/global.css` 中的 CSS 变量
  3. 在 `tailwind.config.js` 中扩展主题

#### 4.2.2 Bundle Size 增加

- **风险描述**：新增依赖可能增加打包体积
- **缓解措施**：
  1. shadcn 组件是复制到项目中的，支持按需引入
  2. 使用 Tree Shaking 移除未使用的代码
  3. 定期检查打包体积

#### 4.2.3 迁移过程中的 Bug

- **风险描述**：替换组件可能引入新的 Bug
- **缓解措施**：
  1. 采用渐进式迁移策略
  2. 每个组件替换后进行充分测试
  3. 保留替换前的 Git 分支，便于回滚

### 4.3 回滚方案

如替换后发现问题：

1. **组件级回滚**：组件替换采用渐进式，可单独回滚某个组件
2. **分支回滚**：Git 分支管理，保留替换前的代码版本
3. **验证策略**：优先在非核心页面验证，确认无问题后再推广

---

## 五、实施计划

### 5.1 第一阶段：核心组件替换（1-2天）

#### 5.1.1 安装组件

- [ ] 执行 `npx shadcn@latest add input`
- [ ] 执行 `npx shadcn@latest add checkbox`
- [ ] 执行 `npx shadcn@latest add label`
- [ ] 执行 `npx shadcn@latest add input-otp`

#### 5.1.2 配置 Sonner Toaster

- [ ] 在 `_app.tsx` 添加 `<Toaster richColors position="top-center" />`

#### 5.1.3 替换 LoginPage 组件

- [ ] 替换所有 `<button>` 为 `<Button>`
- [ ] 替换所有 `<input>` 为 `<Input>` + `<Label>`
- [ ] 替换复选框为 `<Checkbox>`
- [ ] 替换验证码输入为 `<InputOTP>`
- [ ] 删除自定义 Toast，使用 `sonner`

#### 5.1.4 替换 ForgotPasswordPage 组件

- [ ] 应用相同的组件替换

### 5.2 第二阶段：高级优化（可选，1-2天）

#### 5.2.1 安装 Form 方案

- [ ] 执行 `npx shadcn@latest add form`
- [ ] 执行 `pnpm add react-hook-form@^7.50.0 zod@^3.22.0 @hookform/resolvers@^3.3.0`

#### 5.2.2 重构表单为 react-hook-form

- [ ] 创建 zod schema
- [ ] 使用 `<Form>` 组件包装
- [ ] 测试表单验证

### 5.3 验收标准

1. 所有登录注册相关页面使用 shadcn 组件
2. 无 TypeScript 类型错误
3. 所有功能测试通过
4. 视觉效果与设计稿一致

---

## 六、测试验证

### 6.1 功能测试清单

| 场景 | 测试内容 | 预期结果 |
|------|----------|----------|
| 登录 | 输入正确账号密码 | 登录成功，跳转首页 |
| 登录 | 输入错误密码 | Toast 显示错误信息 |
| 登录 | 空表���提交 | 显示字段验证错误 |
| 注册 | 获取验证码 | 验证码输入框自动聚焦 |
| 注册 | 粘贴验证码 | 自动填充全部 6 位 |
| 注册 | 协议复选框 | 点击可切换选中状态 |
| 表单 | Tab 键切换 | 焦点按顺序移动 |
| 表单 | 禁用状态 | 所有输入框和按钮禁用 |

---

## 七、附录：完整代码示例

### 7.1 完整的登录表单示例

```typescript
// src/components/auth/LoginForm.tsx
"use client";
import React from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { apiPost, saveToken } from "@/api/request";
import { api } from "@/constants/api";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoginFormProps {
  onSwitchToRegister: () => void;
  onForgotPassword: () => void;
}

export function LoginForm({
  onSwitchToRegister,
  onForgotPassword,
}: LoginFormProps) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [formData, setFormData] = React.useState({
    phone_number: "",
    password: "",
  });
  const [errors, setErrors] = React.useState({
    phone_number: "",
    password: "",
  });

  // 验证手机号
  const validatePhoneNumber = (phone_number: string): string => {
    if (!phone_number) return "请输入手机号";
    if (!/^1[3-9]\d{9}$/.test(phone_number)) return "请输入正确的11位手机号";
    return "";
  };

  // 验证密码
  const validatePassword = (password: string): string => {
    if (!password) return "请输入密码";
    if (!/^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(password)) {
      return "密码至少6位，且包含字母和数字";
    }
    return "";
  };

  // 处理输入变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // 清空对应字段的错误
    setErrors({ ...errors, [name]: "" });
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证
    const phoneError = validatePhoneNumber(formData.phone_number);
    const passwordError = validatePassword(formData.password);

    if (phoneError || passwordError) {
      setErrors({
        phone_number: phoneError,
        password: passwordError,
      });
      return;
    }

    setLoading(true);
    try {
      const response = await apiPost(api.auth.login, {
        phone_number: formData.phone_number,
        password: btoa(formData.password),
      });

      // 业务错误处理
      if (response.data.code !== 200) {
        toast.error("登录失败", {
          description: response.data.message || "请稍后重试",
        });
        return;
      }

      // 登录成功
      const { token } = response.data.data;
      saveToken(token);

      toast.success("登录成功", {
        description: "正在跳转...",
      });

      // 处理重定向
      const redirectPath = (router.query.redirect as string) || "/chat";
      setTimeout(() => {
        router.push(redirectPath);
      }, 1000);
    } catch (error: any) {
      // HTTP 错误处理（由拦截器处理）
      toast.error("登录失败", {
        description: error.message || "请稍后重试",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 手机号输入框 */}
      <div className="space-y-2">
        <Label htmlFor="phone_number">手机号</Label>
        <Input
          id="phone_number"
          type="tel"
          name="phone_number"
          value={formData.phone_number}
          onChange={handleChange}
          placeholder="请输入手机号"
          disabled={loading}
          className={cn(
            "w-[360px] h-[40px]",
            errors.phone_number && "border-red-500 focus-visible:ring-red-500"
          )}
        />
        {errors.phone_number && (
          <p className="text-sm text-red-500">{errors.phone_number}</p>
        )}
      </div>

      {/* 密码输入框 */}
      <div className="space-y-2">
        <Label htmlFor="password">密码</Label>
        <Input
          id="password"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="请输入密码"
          disabled={loading}
          className={cn(
            "w-[360px] h-[40px]",
            errors.password && "border-red-500 focus-visible:ring-red-500"
          )}
        />
        {errors.password && (
          <p className="text-sm text-red-500">{errors.password}</p>
        )}
      </div>

      {/* 提交按钮 */}
      <div className="pt-4">
        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="w-[360px] h-[40px] bg-gradient-to-r from-[#9459FF] to-[#2E6EFF] text-white rounded-[10px] shadow-[0px_10px_20px_0px_rgba(0,49,255,0.2)] hover:shadow-[0px_10px_20px_0px_rgba(0,49,255,0.3)] font-medium text-lg"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? "登录中..." : "即刻探索"}
        </Button>
      </div>

      {/* 忘记密码链接 */}
      <div className="flex justify-between pt-2 px-2">
        <Button
          type="button"
          variant="link"
          onClick={onSwitchToRegister}
          disabled={loading}
          className="text-blue-500 p-0 h-auto"
        >
          没有账号？去注册
        </Button>
        <Button
          type="button"
          variant="link"
          onClick={onForgotPassword}
          disabled={loading}
          className="text-blue-500 p-0 h-auto"
        >
          忘记密码
        </Button>
      </div>
    </form>
  );
}
```

### 7.2 验证码输入组件示例

```typescript
// src/components/auth/VerificationCodeInput.tsx
import { useEffect, useRef } from "react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

interface VerificationCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

export function VerificationCodeInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  error,
}: VerificationCodeInputProps) {
  const isSubmitting = useRef(false);

  // 自动提交（带防重复机制）
  useEffect(() => {
    if (value.length === 6 && onComplete && !isSubmitting.current) {
      isSubmitting.current = true;
      onComplete(value);
      // 防止重复提交，一定时间后重置
      setTimeout(() => {
        isSubmitting.current = false;
      }, 1000);
    }
  }, [value, onComplete]);

  return (
    <div className="space-y-2">
      <InputOTP
        maxLength={6}
        value={value}
        onChange={onChange}
        disabled={disabled}
      >
        <InputOTPGroup>
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <InputOTPSlot
              key={index}
              index={index}
              className={error ? "border-red-500" : ""}
            />
          ))}
        </InputOTPGroup>
      </InputOTP>
      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
    </div>
  );
}
```

---

## 八、注意事项

### 8.1 样式覆盖

shadcn 组件使用 CSS 变量，如需自定义样式：

**方式 1: 使用 className**

```typescript
<Button className="bg-gradient-to-r from-[#9459FF] to-[#2E6EFF]">
  自定义背景
</Button>
```

**方式 2: 修改 CSS 变量** (`src/styles/global.css`)

```css
@layer base {
  :root {
    --primary: 220 90% 60%; /* 修改主题色 */
  }
}
```

### 8.2 渐进式迁移

建议按以下顺序逐步替换：

1. Sonner Toast（优先级最高，影响最小）
2. Button（简单且收益大）
3. Input（最常用）
4. Checkbox（简单）
5. InputOTP（复杂但收益大）
6. Form（可选，需要重构较多代码）

### 8.3 TypeScript 类型

shadcn 组件完全支持 TypeScript，确保：

```typescript
// 正确的类型导入
import type { ButtonProps } from "@/components/ui/button";

// 自定义组件继承类型
interface CustomButtonProps extends ButtonProps {
  custom_prop?: string;
}
```

---

## 九、预期收益

### 9.1 收益概述

| 改进项 | 说明 |
|--------|------|
| 代码统一性 | 统一使用 shadcn 组件，减少自定义样式代码 |
| 维护成本 | 组件由社区维护，减少自行维护负担 |
| 可访问性 | shadcn 组件内置 ARIA 支持，提升无障碍体验 |
| 开发体验 | 开箱即用，减少重复开发 |
| 用户体验 | 统一的交互反馈，更流畅的动画效果 |

### 9.2 注意事项

- 具体代码量减少取决于实际重构范围
- 建议在实施后统计实际数据
- 首次迁移可能需要额外时间适应组件 API

---

## 十、总结

使用 shadcn/ui 组件替代自定义实现可以带来：

1. **代码统一性提升** - 统一的组件库，更少的自定义代码
2. **维护成本降低** - 社区维护的组件，无需自行处理兼容性问题
3. **用户体验提升** - 更好的动画、交互和可访问性
4. **开发效率提升** - 开箱即用的组件，无需重复造轮子

**推荐实施策略**: 先替换 Sonner Toast、Button、Input 三个核心组件（1天完成），获得立竿见影的效果；然后逐步替换其他组件（1-2天完成）。

---

**文档版本**: v1.2
**最后更新**: 2025-11-26
