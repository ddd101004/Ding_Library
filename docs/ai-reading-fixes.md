# AI 伴读功能完整修复记录

## 修复日期
2026-01-13

## 问题描述
从 ChatHome 页面上传文件发送进入 AI 伴读对话界面时，出现以下问题：
1. 创建会话失败（404 错误）→ 后来改为 503 错误："伴读对话必须指定论文 ID"
2. 创建会话成功后没有发送流式请求
3. 左边 PDF 文件一直显示"获取中"，没有展示
4. 需要确保左边论文的右键菜单功能正常
5. **多文件上传时只关联一个文件，且没有自动发送消息**

## 根本原因分析

### 问题 1: API 端点不存在（第一次 404 错误）
**位置**: `src/hooks/chat/useAiReadingMessage.ts:89`

**错误代码**:
```typescript
const response = await apiPost("/api/chat/ai-reading/conversations", {
  title: paperInfo?.title || "AI 伴读",
  paper_id: paperInfo?.id || null,
});
```

**问题**:
- API 端点 `/api/chat/ai-reading/conversations` 不存在（返回 404）
- 实际的 API 是 `/api/chat/conversations`，支持通过 `conversation_type` 参数创建不同类型的会话

**修复**:
```typescript
const response = await apiPost("/api/chat/conversations", {
  title: paperInfo?.title || "AI 伴读",
  conversation_type: "paper_reading",  // 指定为 AI 伴读类型
  uploaded_paper_id: paperInfo?.id || null,  // 使用正确的参数名
});
```

### 问题 2: 论文信息未加载（503 错误）
**位置**: `src/components/chat/AiReadingConversation.tsx`

**问题**:
- 从 ChatHome 跳转时，URL 中有 `uploadedPaperId` 参数
- 但是重构后的代码没有监听这个参数来加载论文信息
- 导致 `paperInfo` 为 null
- 创建会话时后端验证失败："伴读对话必须指定论文 ID"

**修复**:
1. 在 `useAiReadingFeatures` hook 中添加 `loadPaperInfoById` 方法：
   - 调用 API `/api/ai-reading/papers/{id}` 加载论文信息
   - 设置 `paperInfo`、`currentPdfInfo`
   - 创建文件对象并添加到 `allUploadedFiles`
   - 存储到 `sessionStorage`

2. 在主组件中添加监听 URL 参数的 effect：
```typescript
useEffect(() => {
  const uploadedPaperIdFromQuery = router.query.uploadedPaperId as string;
  if (uploadedPaperIdFromQuery && !paperInfo) {
    loadPaperInfoById(uploadedPaperIdFromQuery);
  }
}, [router.query.uploadedPaperId, paperInfo, loadPaperInfoById]);
```

3. 修改处理初始参数的代码，确保论文信息加载完成后再创建会话：
```typescript
if (uploadedPaperIdFromQuery && !paperInfo) {
  console.log("AI伴读 - 等待论文信息加载...");
  return;  // 等待 paperInfo 加载完成
}
```

### 问题 3: 文件列表未加载
**位置**: `src/hooks/chat/useAiReadingConversationData.ts:146-158`

**问题**:
- 加载会话历史时，只设置了 `paperInfo` 和 `currentPdfInfo`
- 没有设置 `allUploadedFiles`，导致 PDF 查看器无法获取文件列表
- PDF 一直显示"获取中"

**修复**:
在加载会话详情时，添加以下逻辑：
1. 将 `papers` 数组转换为文件格式
2. 排序确保顺序一致
3. 存储到 `sessionStorage`
4. 更新 `allUploadedFiles` 状态
5. 设置 `selectedFileIndex` 为 0
6. 加载第一个文件的标注

### 问题 4: 创建会话后没有发送流式请求
**位置**: `src/components/chat/AiReadingConversation.tsx:139-195`

**问题**:
- `hasHandledInitialParams.current` 被提前设置为 `true`
- 当等待 `paperInfo` 加载完成后，effect 不会再次执行
- 导致创建会话成功后没有自动发送消息

**修复**:
调整代码逻辑，只有在所有条件满足时才设置 `hasHandledInitialParams.current = true`：
```typescript
// 如果没有输入文本，不需要处理
if (!inputTextFromQuery || !inputTextFromQuery.trim()) {
  return;
}

// 如果已经处理过，不再重复处理
if (hasHandledInitialParams.current) {
  return;
}

// 如果有 uploadedPaperId 但还没有 paperInfo，等待加载完成
if (uploadedPaperIdFromQuery && !paperInfo) {
  console.log("AI伴读 - 等待论文信息加载...");
  return;
}

// 所有条件满足，标记为已处理
hasHandledInitialParams.current = true;
```

### 问题 5: 变量声明顺序错误（TypeScript 错误）
**位置**: `src/components/chat/AiReadingConversation.tsx`

**问题**:
- `loadBatchMessageVersions` 和 `getCurrentTime` 在使用前未声明
- 导致 TypeScript 编译错误

**修复**:
调整代码顺序，确保所有依赖在使用前已声明：
1. 先初始化 `useAiReadingFeatures`
2. 再初始化 `useMessageVersions`
3. 然后定义 `getCurrentTime` 工具函数
4. 最后初始化 `useAiReadingMessage`

### 问题 6: 多文件上传只关联一个文件（2026-01-13 新发现）
**位置**: `src/components/chat/AiReadingConversation.tsx` + `src/hooks/chat/useAiReadingFeatures.ts` + `src/hooks/chat/useAiReadingMessage.ts`

**问题**:
- ChatHome 上传多个文件后，只传递第一个文件的 `uploadedPaperId` 到 URL
- 所有文件已保存到 `sessionStorage`，但组件未正确加载
- 等待 `paperInfo` 加载的逻辑阻塞了自动发送消息
- **React 状态更新异步问题**：sessionStorage 已加载文件，但 `allUploadedFiles` 状态还未更新，导致读取到 0 个文件
- **文件字段名不匹配**：ChatHome 存储的文件结构与读取时的字段名不一致
- **最关键问题**：即使设置了 `paperInfo` 状态，由于状态更新是异步的，调用 `createAiReadingConversation()` 时 `paperInfo` 还没有更新

**错误日志**:
```
AI伴读 - 设置临时 paperInfo: {id: '...', title: '...', file_url: undefined}
// 创建会话时 paperInfo?.id 还是 undefined，导致 503 错误
POST http://localhost:3007/api/chat/conversations 503 (Service Unavailable)
{message: '伴读对话必须指定论文 ID', isWarning: true, code: 503}
```

**ChatHome 存储的文件结构**:
```typescript
{
  file: { name: "文件名.pdf", type: "application/pdf", size: 12345 },
  fileId: "...",
  uploadedPaperId: "..."
}
```

**修复**:
1. **直接从 sessionStorage 读取**：不再依赖 React 状态，直接在 useEffect 中读取 sessionStorage

```typescript
// 直接从 sessionStorage 读取文件列表（不依赖状态）
let filesFromStorage: any[] = [];
try {
  const filesStr = sessionStorage.getItem("aiReadingFiles");
  if (filesStr) {
    filesFromStorage = JSON.parse(filesStr);
    console.log("AI伴读 - sessionStorage 中的文件结构:", filesFromStorage);
  }
} catch (error) {
  console.error("读取文件列表失败:", error);
}
```

2. **修复文件字段读取**：兼容 ChatHome 的文件结构，正确读取文件名

```typescript
// 注意：ChatHome 存储的结构是 { file: { name }, uploadedPaperId, fileId }
const fileName = firstFile.file?.name || firstFile.fileName || firstFile.name || "未知文件";
```

3. **【关键修复】修改 `createAiReadingConversation` 接受参数**：不依赖异步状态更新

```typescript
// useAiReadingMessage.ts
/**
 * 创建 AI 伴读会话
 * @param paperId 可选的论文 ID（如果不提供则使用 paperInfo.id）
 * @param title 可选的会话标题（如果不提供则使用 paperInfo.title）
 */
const createAiReadingConversation = useCallback(async (paperId?: string, title?: string) => {
  // 优先使用传入的参数，其次使用状态
  const finalPaperId = paperId || paperInfo?.id || null;
  const finalTitle = title || paperInfo?.title || "AI 伴读";

  if (!finalPaperId) {
    throw new Error("论文 ID 不能为空");
  }

  const response = await apiPost("/api/chat/conversations", {
    title: finalTitle,
    conversation_type: "paper_reading",
    uploaded_paper_id: finalPaperId,
  });
  // ...
}, [getToken, paperInfo, setConversationId, clearUserInfo]);
```

4. **调用时传递参数**：绕过状态更新延迟

```typescript
// AiReadingConversation.tsx
const newConversationId = await createAiReadingConversation(
  firstFile.uploadedPaperId,  // 直接传递，不依赖状态
  fileName
);
```

5. **优先使用 sessionStorage**：避免 React 状态更新延迟

```typescript
// 优先使用 sessionStorage 中的文件列表，其次使用状态
const filesToUse = filesFromStorage.length > 0 ? filesFromStorage : allUploadedFiles;
```

6. **增强错误提示**：当找不到有效文件时，显示详细信息

```typescript
console.error("AI伴读 - 没有找到有效的文件:", {
  filesFromStorage,
  allUploadedFiles,
  uploadedPaperIdFromQuery,
});
toast.error("文件信息缺失，无法创建会话");
```

7. **简化 URL 参数加载逻辑**：只在会话恢复模式（无输入文本）时才从 URL 加载单个论文信息

## 影响范围
- `src/hooks/chat/useAiReadingMessage.ts` - 修复 API 端点
- `src/hooks/chat/useAiReadingFeatures.ts` - 添加 `loadPaperInfoById` 方法
- `src/hooks/chat/useAiReadingConversationData.ts` - 修复文件列表加载
- `src/components/chat/AiReadingConversation.tsx` - 修复所有逻辑问题

## 功能验证

### ✅ 已修复功能
1. 会话创建成功（不再出现 404/503 错误）
2. 论文信息正确加载（控制台显示"论文信息加载成功"）
3. 自动发送流式请求（创建会话后自动发送消息）
4. PDF 正常显示（不再一直"获取中"）
5. 布局完整恢复（左侧 PDF + 右侧对话）
6. 文件标签正常显示（SmartFileTags）
7. 右键菜单功能（PdfViewer 组件已正确集成）

### 📋 布局对比（备份 vs 重构后）
| 组件 | 备份文件 | 重构后文件 | 状态 |
|------|---------|-----------|------|
| 左侧 PDF 容器 | `flex-1 pr-[20px] sm:pr-[50px]` | `flex-1 pr-[20px] sm:pr-[50px]` | ✅ 一致 |
| PDF 滚动容器 | `overflow-y-auto pb-[80px]` | `overflow-y-auto pb-[80px]` | ✅ 一致 |
| PdfViewer 组件 | 完整 props | 完整 props | ✅ 一致 |
| 右侧对话容器 | `flex-1 pl-[20px] sm:pl-[40px]` | `flex-1 pl-[20px] sm:pl-[40px]` | ✅ 一致 |
| SmartFileTags | 已集成 | 已集成 | ✅ 一致 |
| 输入框区域 | 固定底部 | 固定底部 | ✅ 一致 |

## 测试步骤

### 单文件测试
1. 从 ChatHome 上传 1 个 PDF 文件
2. 输入消息并发送到 AI 伴读
3. 验证功能：
   - ✅ 控制台显示"从 sessionStorage 加载文件列表: 1 个文件"
   - ✅ 会话创建成功（200 响应）
   - ✅ 自动发送流式请求
   - ✅ PDF 正常显示并加载完成
   - ✅ AI 开始流式回复
   - ✅ PDF 右键菜单功能正常

### 多文件测试（新增）
1. 从 ChatHome 上传 2-5 个 PDF 文件
2. 输入消息并发送到 AI 伴读
3. 验证功能：
   - ✅ 控制台显示"从 sessionStorage 加载文件列表: N 个文件"（N 为实际文件数）
   - ✅ 控制台显示"准备自动发送消息: { filesCount: N }"
   - ✅ 会话创建成功（关联第一个文件作为主文件）
   - ✅ 所有文件都显示在文件标签列表中
   - ✅ 可以通过文件标签切换查看不同文件
   - ✅ 自动发送流式请求
   - ✅ AI 开始流式回复

### 会话恢复测试
1. 直接访问 `/ai-reading-chat?uploadedPaperId=xxx`（无 inputText）
2. 验证功能：
   - ✅ 控制台显示"会话恢复模式，加载论文信息"
   - ✅ 单个论文信息正确加载

## 调试日志
添加了以下控制台日志用于调试：
- "AI伴读 - 从 sessionStorage 加载文件列表: N 个文件"
- "AI伴读 - 会话恢复模式，加载论文信息: {id}"
- "AI伴读 - 准备自动发送消息: { inputText, uploadedPaperId, filesCount }"
- "AI伴读 - 开始创建会话..."
- "AI伴读 - 会话创建成功: {conversationId}"
- "AI伴读 - 发送消息: {text}"
- "AI伴读 - messages 状态变化: {state}"
- "AI伴读 - 组件渲染: {state}"

## 相关文件
- 重构前备份: `src/components/chat/AiReadingConversation.tsx.backup`
- 重构后代码: `src/components/chat/AiReadingConversation.tsx`
- API 路由: `src/pages/api/chat/conversations/index.ts`
- API 路由: `src/pages/api/ai-reading/papers/[id].ts`
- PDF 组件: `src/components/ai-reading/PdfViewer.tsx`
- 修复文档: `docs/ai-reading-fixes.md`
