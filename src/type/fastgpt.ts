/**
 * FastGPT RAG 平台相关类型定义
 */

// ==================== 知识库相关类型 ====================

/**
 * 知识库创建参数
 */
export interface CreateDatasetParams {
  /** 父级ID，null表示根目录 */
  parentId?: string | null;
  /** 类型，dataset（知识库）或 folder（文件夹） */
  type?: "dataset" | "folder";
  /** 知识库名称 */
  name: string;
  /** 知识库介绍（可用于存储 sourceId 以支持搜索去重） */
  intro?: string;
  /** 头像 */
  avatar?: string;
  /** 向量模型 */
  vectorModel?: string;
  /** Agent模型 */
  agentModel?: string;
  /** VLM模型 */
  vlmModel?: string;
}

/**
 * 知识库列表查询参数
 */
export interface ListDatasetsParams {
  /** 父级ID，空字符串表示根目录 */
  parentId?: string | null;
  /** 知识库类型过滤 */
  type?: "dataset" | "folder";
  /** 搜索关键词（搜索 name 和 intro 字段） */
  searchKey?: string;
}

/**
 * 知识库信息
 */
export interface DatasetInfo {
  _id: string;
  parentId: string | null;
  name: string;
  intro?: string;
  avatar?: string;
  type: string;
  vectorModel: string;
  agentModel?: string;
  createTime: string;
  updateTime: string;
}

/**
 * 知识库列表项
 */
export interface DatasetListItem extends DatasetInfo {
  /** 文件数量 */
  fileCount?: number;
}

// ==================== 集合（文件）相关类型 ====================

/**
 * 训练类型
 */
export type TrainingType = "chunk" | "qa";

/**
 * 分块设置模式
 */
export type ChunkSettingMode = "auto" | "custom";

/**
 * 分块拆分模式
 */
export type ChunkSplitMode = "size" | "char";

/**
 * 集合创建通用参数
 */
export interface CreateCollectionBaseParams {
  /** 知识库ID */
  datasetId: string;
  /** 父级ID */
  parentId?: string | null;
  /** 训练类型 */
  trainingType: TrainingType;
  /** 是否自动生成标题索引 */
  indexPrefixTitle?: boolean;
  /** 是否开启PDF增强解析 */
  customPdfParse?: boolean;
  /** 是否自动生成索引（商业版） */
  autoIndexes?: boolean;
  /** 是否自动生成图片索引（商业版） */
  imageIndex?: boolean;
  /** 分块参数模式 */
  chunkSettingMode?: ChunkSettingMode;
  /** 分块拆分模式 */
  chunkSplitMode?: ChunkSplitMode;
  /** 分块大小 */
  chunkSize?: number;
  /** 索引大小 */
  indexSize?: number;
  /** 自定义分割符号 */
  chunkSplitter?: string;
  /** QA拆分提示词 */
  qaPrompt?: string;
  /** 集合标签 */
  tags?: string[];
  /** 文件创建时间 */
  createTime?: string | Date;
  /** 元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 创建空集合参数
 */
export interface CreateEmptyCollectionParams {
  datasetId: string;
  parentId?: string | null;
  name: string;
  /** 集合描述（可用于存储标识信息便于搜索匹配） */
  intro?: string;
  type?: "virtual";
  metadata?: Record<string, unknown>;
}

/**
 * 创建纯文本集合参数
 */
export interface CreateTextCollectionParams extends CreateCollectionBaseParams {
  /** 文本内容 */
  text: string;
  /** 集合名称 */
  name: string;
}

/**
 * 创建链接集合参数
 */
export interface CreateLinkCollectionParams extends CreateCollectionBaseParams {
  /** 链接地址 */
  link: string;
}

/**
 * 创建文件集合参数（form-data格式）
 */
export interface CreateFileCollectionParams extends CreateCollectionBaseParams {
  /** 文件（File对象或Buffer） */
  file: File | Buffer;
  /** 文件名 */
  filename?: string;
}

/**
 * 集合信息
 */
export interface CollectionInfo {
  _id: string;
  datasetId: string;
  parentId: string | null;
  name: string;
  /** 集合描述 */
  intro?: string;
  type: string;
  trainingType?: string;
  chunkSize?: number;
  createTime: string;
  updateTime: string;
  metadata?: Record<string, unknown>;
  /** 数据数量 */
  dataAmount?: number;
  /** 训练状态 */
  trainingStatus?: string;
  /** 标签 */
  tags?: string[];
}

/**
 * 集合列表参数
 */
export interface ListCollectionParams {
  datasetId: string;
  parentId?: string | null;
  offset?: number;
  pageSize?: number;
  searchText?: string;
}

/**
 * 集合列表响应
 */
export interface ListCollectionResponse {
  list: CollectionInfo[];
  total: number;
}

// ==================== 数据相关类型 ====================

/**
 * 索引类型
 */
export type IndexType = "default" | "custom" | "summary" | "question" | "image";

/**
 * 索引信息
 */
export interface DataIndex {
  /** 索引类型 */
  type?: IndexType;
  /** 关联的向量ID */
  dataId?: string;
  /** 文本内容 */
  text: string;
}

/**
 * 数据项
 */
export interface DataItem {
  /** 主要数据 */
  q: string;
  /** 辅助数据 */
  a?: string;
  /** 向量索引 */
  indexes?: DataIndex[];
}

/**
 * 批量添加数据参数
 */
export interface PushDataParams {
  /** 集合ID */
  collectionId: string;
  /** 训练类型 */
  trainingType?: TrainingType;
  /** QA拆分提示词 */
  prompt?: string;
  /** 订单ID */
  billId?: string;
  /** 数据列表 */
  data: DataItem[];
}

/**
 * 数据详情
 */
export interface DataInfo {
  _id: string;
  collectionId: string;
  datasetId: string;
  q: string;
  a?: string;
  indexes: DataIndex[];
  updateTime: string;
  chunkIndex?: number;
}

/**
 * 数据列表参数
 */
export interface ListDataParams {
  collectionId: string;
  offset?: number;
  pageSize?: number;
  searchText?: string;
}

/**
 * 数据列表响应
 */
export interface ListDataResponse {
  list: DataInfo[];
  total: number;
}

// ==================== 搜索相关类型 ====================

/**
 * 搜索模式
 */
export type SearchMode = "embedding" | "fullTextRecall" | "mixedRecall";

/**
 * 搜索测试参数
 */
export interface SearchTestParams {
  /** 知识库ID */
  datasetId: string;
  /** 搜索文本 */
  text: string;
  /** 返回数量限制 */
  limit?: number;
  /** 相似度阈值 */
  similarity?: number;
  /** 搜索模式 */
  searchMode?: SearchMode;
  /** 是否使用重排序 */
  usingReRank?: boolean;
  /** 是否使用扩展查询 */
  datasetSearchUsingExtensionQuery?: boolean;
  /** 扩展查询模型 */
  datasetSearchExtensionModel?: string;
  /** 扩展查询背景 */
  datasetSearchExtensionBg?: string;
}

/**
 * 搜索结果分数项
 */
export interface SearchScoreItem {
  index: number;
  type: string;
  value: number;
}

/**
 * 搜索结果项（匹配 FastGPT API 实际返回格式）
 */
export interface SearchResultItem {
  id: string;
  datasetId: string;
  collectionId: string;
  q: string;
  a?: string;
  score: SearchScoreItem[];
  sourceName?: string;
  sourceId?: string;
  chunkIndex?: number;
  tokens?: number;
  updateTime?: string;
  indexes?: DataIndex[];
}

// ==================== 对话相关类型 ====================

/**
 * 对话消息角色
 */
export type MessageRole = "user" | "assistant" | "system";

/**
 * 对话消息
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

/**
 * 对话请求参数
 */
export interface ChatCompletionParams {
  /** 对话ID，用于关联历史记录 */
  chatId?: string;
  /** 是否流式输出 */
  stream?: boolean;
  /** 是否返回详情 */
  detail?: boolean;
  /** 响应消息ID */
  responseChatItemId?: string;
  /** 变量 */
  variables?: Record<string, unknown>;
  /** 消息列表 */
  messages: ChatMessage[];
}

/**
 * 非流式对话响应
 */
export interface ChatCompletionResponse {
  id: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
    index: number;
  }>;
  /** 详细响应数据（detail=true时） */
  responseData?: Array<{
    nodeId: string;
    moduleName: string;
    moduleType: string;
    totalPoints?: number;
    model?: string;
    tokens?: number;
    query?: string;
    runningTime?: number;
    historyPreview?: Array<{
      obj: string;
      value: string;
    }>;
    quoteList?: Array<{
      id: string;
      q: string;
      a?: string;
      source?: string;
      score?: number;
    }>;
  }>;
}

/**
 * 流式对话响应块
 */
export interface ChatCompletionChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

// ==================== 历史记录相关类型 ====================

/**
 * 获取历史记录参数
 */
export interface GetHistoriesParams {
  /** 应用ID */
  appId: string;
  /** 偏移量 */
  offset?: number;
  /** 每页数量 */
  pageSize?: number;
  /** 来源 */
  source?: "api" | "online" | "share" | "test";
}

/**
 * 历史记录项
 */
export interface HistoryItem {
  chatId: string;
  title: string;
  customTitle?: string;
  top?: boolean;
  source: string;
  updateTime: string;
}

/**
 * 历史记录列表响应
 */
export interface GetHistoriesResponse {
  list: HistoryItem[];
  total: number;
}

/**
 * 对话记录项
 */
export interface ChatRecordItem {
  dataId: string;
  obj: "Human" | "AI";
  value: string;
  userGoodFeedback?: string;
  userBadFeedback?: string;
  responseData?: ChatCompletionResponse["responseData"];
}

/**
 * 获取对话记录参数
 */
export interface GetChatRecordsParams {
  appId: string;
  chatId: string;
  offset?: number;
  pageSize?: number;
  loadCustomFeedbacks?: boolean;
}

/**
 * 对话记录列表响应
 */
export interface GetChatRecordsResponse {
  list: ChatRecordItem[];
  total: number;
}

// ==================== 通用响应类型 ====================

/**
 * FastGPT API 通用响应
 */
export interface FastGPTResponse<T = unknown> {
  code: number;
  statusText?: string;
  message?: string;
  data: T;
}

/**
 * 创建集合响应
 */
export interface CreateCollectionResult {
  collectionId: string;
  insertLen?: number;
}

/**
 * 创建知识库响应
 */
export interface CreateDatasetResult {
  id: string;
}

/**
 * 错误响应
 */
export interface FastGPTError {
  code: number;
  statusText: string;
  message: string;
}
