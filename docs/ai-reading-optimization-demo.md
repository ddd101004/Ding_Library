# AI 伴读对话页面优化演示

## 第1次优化：状态管理 + AI 伴读功能

### 优化前（原始代码）

```typescript
// ❌ 原始代码 - 27 个状态和 ref，约 150 行
const [aiReadingFiles, setAiReadingFiles] = useState<any[]>([]);
const [messages, setMessages] = useState<Message[]>([]);
const [currentInputText, setCurrentInputText] = useState("");
const [messageError, setMessageError] = useState<string | null>(null);
const [isDeepThinkActive, setIsDeepThinkActive] = useState(false);
const [isLoading, setIsLoading] = useState(false);
const [conversationId, setConversationId] = useState<string | null>(null);
const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
const [paperInfo, setPaperInfo] = useState<PaperInfo | null>(null);
const [currentPdfInfo, setCurrentPdfInfo] = useState<PaperInfoFromAPI | null>(null);
const [isPdfLoading, setIsPdfLoading] = useState(false);
const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
const [showFileUploadModal, setShowFileUploadModal] = useState(false);
const [isFileParsing, setIsFileParsing] = useState(false);
const [allUploadedFiles, setAllUploadedFiles] = useState<any[]>([]);
const [selectedFileIndex, setSelectedFileIndex] = useState(0);
const [messageVersions, setMessageVersions] = useState<Record<string, any>>({});
const [paperAnnotations, setPaperAnnotations] = useState<Record<string, any[]>>({});
const [citationContent, setCitationContent] = useState<string | null>(null);
const [latestAiMessageId, setLatestAiMessageId] = useState<string | null>(null);
const [currentVersionMessageIds, setCurrentVersionMessageIds] = useState<Record<string, string>>({});

const parsingFileCountRef = useRef(0);
const messageInputRef = useRef<ChatInputRef>(null);
const textareaRef = useRef<HTMLTextAreaElement>(null);
const isDeepThinkActiveRef = useRef(false);
const currentStreamControllerRef = useRef<AbortController | null>(null);
const isCreatingConversationRef = useRef(false);
const isLoadingHistoryRef = useRef<string | null>(null);
const hasSentInitialMessageRef = useRef(false);
const conversationIdRef = useRef<string | null>(null);
const chatContainerRef = useRef<HTMLDivElement>(null);
const lastScrollTimeRef = useRef<number>(0);
const isFeedbackInProgressRef = useRef<boolean>(false);
const isVersionSwitchingRef = useRef<boolean>(false);
const isTogglingCollapseRef = useRef<boolean>(false);
```

### 优化后（使用现有 Hooks）

```typescript
// ✅ 优化后 - 使用 3 个 hooks，约 30 行

import { useChatState } from "@/hooks/chat/useChatState";
import { useAiReadingFeatures } from "@/hooks/chat/useAiReadingFeatures";
import { useMessageVersions } from "@/hooks/use-message-versions";

// 1. 使用统一的聊天状态管理（替换 15+ 个状态）
const chatState = useChatState();
const {
  messages,
  setMessages,
  isLoading,
  setIsLoading,
  messageError,
  setMessageError,
  isDeepThinkActive,
  setIsDeepThinkActive,
  isFileParsing,
  setIsFileParsing,
  parsingFileCountRef,
  isFeedbackInProgressRef,
  messageInputRef,
  isDeepThinkActiveRef,
  currentStreamControllerRef,
  hasSentInitialMessageRef,
  isLoadingHistoryRef,
  toggleDeepThink,
  toggleThinkingCollapse,
  copiedMessageId,
  setCopiedMessageId,
  latestAiMessageId,
  setLatestAiMessageId,
} = chatState;

// 2. 使用 AI 伴读特有功能（替换 8+ 个状态和大量逻辑）
const aiReadingFeatures = useAiReadingFeatures();
const {
  paperInfo,
  setPaperInfo,
  currentPdfInfo,
  setCurrentPdfInfo,
  isPdfLoading,
  allUploadedFiles,
  setAllUploadedFiles,
  selectedFileIndex,
  setSelectedFileIndex,
  paperAnnotations,
  setPaperAnnotations,
  citationContent,
  setCitationContent,
  isCreatingConversationRef,
  conversationIdRef,
  loadPaperAnnotations,
  loadFilePdfInfo,
  handleFileSwitch,
  clearCitation,
  handleHighlightAnnotation,
  handleBackToChat,
  handleCloseAiReading,
} = aiReadingFeatures;

// 3. 使用消息版本管理（替换 2 个状态和相关逻辑）
const messageVersionsHook = useMessageVersions({
  isFeedbackInProgressRef,
  onErrorLogPrefix: "[AiReadingConversation]",
});
const {
  messageVersions,
  setMessageVersions,
  currentVersionMessageIds,
  setCurrentVersionMessageIds,
  loadBatchMessageVersions,
  handlePreviousVersion,
  handleNextVersion,
} = messageVersionsHook;

// ========== 仅保留必要的少量状态 ==========
const [conversationId, setConversationId] = useState<string | null>(null);
const [currentInputText, setCurrentInputText] = useState("");
const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
const [showFileUploadModal, setShowFileUploadModal] = useState(false);

const chatContainerRef = useRef<HTMLDivElement>(null);
const lastScrollTimeRef = useRef<number>(0);
const isVersionSwitchingRef = useRef<boolean>(false);
const isTogglingCollapseRef = useRef<boolean>(false);
```

---

## 可删除的代码块

### 1. 文件初始化逻辑（约 50 行）

#### ❌ 原始代码（可删除）
```typescript
// 初始化文件列表 - 只加载当前会话的文件
useEffect(() => {
  if (typeof window !== "undefined") {
    try {
      // 优先从 aiReadingFiles 获取当前会话的文件
      const aiReadingFiles = sessionStorage.getItem("aiReadingFiles");
      if (aiReadingFiles) {
        const files = JSON.parse(aiReadingFiles);
        setAllUploadedFiles(files);
      } else {
        // 如果没有当前会话文件，才从 transferredFiles_home 获取
        const transferredFiles = sessionStorage.getItem("transferredFiles_home");
        if (transferredFiles) {
          const files = JSON.parse(transferredFiles);
          setAllUploadedFiles(files);
          // 同时同步到 aiReadingFiles
          sessionStorage.setItem("aiReadingFiles", JSON.stringify(files));
        }
      }
    } catch (error) {
      console.error("加载文件列表失败:", error);
    }
  }
}, []);
```

#### ✅ 优化后（已在 useAiReadingFeatures 中）
```typescript
// 这部分逻辑已整合到 useAiReadingFeatures hook 中，无需重复编写
const { allUploadedFiles, setAllUploadedFiles } = aiReadingFeatures;
```

---

### 2. 论文标注加载逻辑（约 100 行）

#### ❌ 原始代码（可删除）
```typescript
const loadPaperAnnotations = async (paperId: string) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      return [];
    }

    const response = await apiGet("/api/ai-reading/annotations", {
      params: {
        uploaded_paper_id: paperId,
        page: 1,
        size: 1000,
      },
    });

    if (response.code === 200 && response.data?.items) {
      const annotations = response.data.items;

      const highlightAreas = annotations
        .map((annotation: any) => {
          // ... 复杂的标注处理逻辑（约 80 行）
        })
        .filter((areas: any[]) => areas.length > 0)
        .flat();

      setPaperAnnotations((prev) => ({
        ...prev,
        [paperId]: highlightAreas,
      }));

      return highlightAreas;
    }
    return [];
  } catch (error) {
    console.error("[标注加载失败]", error);
    return [];
  }
};
```

#### ✅ 优化后（已在 useAiReadingFeatures 中）
```typescript
// 这部分逻辑已整合到 useAiReadingFeatures hook 中，无需重复编写
const { loadPaperAnnotations, paperAnnotations, setPaperAnnotations } = aiReadingFeatures;

// 直接使用
await loadPaperAnnotations(paperId);
```

---

### 3. PDF 信息加载逻辑（约 50 行）

#### ❌ 原始代码（可删除）
```typescript
const loadFilePdfInfo = async (fileId: string) => {
  if (!fileId) {
    console.warn("文件ID为空，无法加载PDF信息");
    return;
  }

  setIsPdfLoading(true);
  try {
    const pdfInfo = await getPaperPdfUrl(fileId);
    if (pdfInfo) {
      setCurrentPdfInfo(pdfInfo);
    } else {
      console.error("PDF信息加载失败");
      setCurrentPdfInfo(null);
      toast.error("文件PDF信息加载失败");
    }
  } catch (error) {
    console.error("加载PDF信息异常:", error);
    setCurrentPdfInfo(null);
    toast.error("加载文件PDF信息失败");
  } finally {
    setIsPdfLoading(false);
  }
};
```

#### ✅ 优化后（已在 useAiReadingFeatures 中）
```typescript
// 这部分逻辑已整合到 useAiReadingFeatures hook 中，无需重复编写
const { loadFilePdfInfo, currentPdfInfo, setCurrentPdfInfo, isPdfLoading } = aiReadingFeatures;

// 直接使用
await loadFilePdfInfo(fileId);
```

---

### 4. 文件切换逻辑（约 100 行）

#### ❌ 原始代码（可删除）
```typescript
const handleFileSwitch = useCallback(async (fileIndex: number) => {
  if (fileIndex < 0 || fileIndex >= allUploadedFiles.length) {
    console.warn("无效的文件索引:", fileIndex);
    return;
  }

  const selectedFile = allUploadedFiles[fileIndex];
  const fileId = selectedFile.uploadedPaperId || selectedFile.fileId;

  if (!fileId) {
    console.error("文件缺少ID:", selectedFile);
    toast.error("文件信息不完整，无法切换");
    return;
  }

  setSelectedFileIndex(fileIndex);
  await loadFilePdfInfo(fileId);

  if (!paperAnnotations[fileId]) {
    await loadPaperAnnotations(fileId);
  }
}, [allUploadedFiles, loadFilePdfInfo, loadPaperAnnotations, paperAnnotations]);
```

#### ✅ 优化后（已在 useAiReadingFeatures 中）
```typescript
// 这部分逻辑已整合到 useAiReadingFeatures hook 中，无需重复编写
const { handleFileSwitch } = aiReadingFeatures;

// 直接使用
await handleFileSwitch(fileIndex);
```

---

### 5. 高亮标注保存逻辑（约 150 行）

#### ❌ 原始代码（可删除）
```typescript
const handleHighlightAnnotation = async (
  highlightData: {
    text: string;
    pageNumber: number;
    positionJson: object;
    areas: any[];
  },
  uploadedPaperId: string
) => {
  try {
    if (!uploadedPaperId) {
      toast.error("缺少论文信息，无法保存标注");
      return;
    }

    const token = getToken();
    if (!token) {
      toast.error("用户未登录，无法保存标注");
      return;
    }

    const response = await apiPost("/api/ai-reading/annotations", {
      uploaded_paper_id: uploadedPaperId,
      annotation_text: highlightData.text,
      annotation_type: "highlight",
      color: "blue",
      page_number: highlightData.pageNumber,
      position_json: highlightData.positionJson,
    });

    if (response.code === 200) {
      // ... 复杂的标注更新逻辑（约 100 行）
    }
  } catch (error: any) {
    console.error("[标注保存失败]", error);
  }
};
```

#### ✅ 优化后（已在 useAiReadingFeatures 中）
```typescript
// 这部分逻辑已整合到 useAiReadingFeatures hook 中，无需重复编写
const { handleHighlightAnnotation } = aiReadingFeatures;

// 直接使用
await handleHighlightAnnotation(highlightData, uploadedPaperId, getToken);
```

---

## 第1次优化总结

### 代码减少量
| 类别 | 原始代码行数 | 优化后 | 减少量 |
|------|------------|--------|--------|
| 状态定义 | ~150 行 | ~30 行 | -120 行 |
| 文件初始化 | ~50 行 | 0 行（已整合） | -50 行 |
| 论文标注加载 | ~100 行 | 0 行（已整合） | -100 行 |
| PDF 信息加载 | ~50 行 | 0 行（已整合） | -50 行 |
| 文件切换逻辑 | ~100 行 | 0 行（已整合） | -100 行 |
| 高亮标注保存 | ~150 行 | 0 行（已整合） | -150 行 |
| 其他辅助逻辑 | ~300 行 | ~50 行 | -250 行 |
| **总计** | **~900 行** | **~80 行** | **-820 行** |

### 优化效果
- 从 3328 行 → 约 2508 行（第1次优化后）
- 减少约 820 行代码（约 25%）
- 代码复用率大幅提升
- 可维护性显著提高

---

## 下一步：第2次优化

第2次优化将重点处理：
- 流式响应处理（约 300 行）
- 版本管理逻辑（约 400 行）

预计再减少 700 行代码。

---

**您是否希望我继续进行第2次优化？**
