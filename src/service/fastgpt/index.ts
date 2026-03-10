/**
 * FastGPT 服务层统一导出
 */

// 客户端
export { fastgptClient, FastGPTClient } from "./client";
export type { FastGPTClientConfig } from "./client";

// 知识库服务
export {
  createDataset,
  listDatasets,
  getDatasetDetail,
  updateDataset,
  deleteDataset,
} from "./dataset";

// 集合（文件）服务
export {
  createEmptyCollection,
  createTextCollection,
  createLinkCollection,
  createFileCollection,
  listCollections,
  getCollectionDetail,
  updateCollection,
  deleteCollections,
  getMimeType,
} from "./collection";

// 数据服务
export {
  pushData,
  pushDataBatch,
  listData,
  getDataDetail,
  updateData,
  deleteData,
  searchDataset,
} from "./data";

// 对话服务
export {
  chatCompletion,
  chatCompletionStream,
  parseSSEChunk,
  getHistories,
  updateHistoryTitle,
  toggleHistoryTop,
  deleteHistory,
  clearHistories,
  getChatInit,
  getChatRecords,
  getChatResData,
  deleteChatItem,
  updateGoodFeedback,
  updateBadFeedback,
  createQuestionGuide,
} from "./chat";

// 公共数据集同步服务
export {
  syncPaperToDataset,
  syncPapersToDataset,
  syncPapersToDatasetByIds,
  syncPaperToDatasetAsync,
  getPublicDatasetId,
  isPublicDatasetConfigured,
} from "./publicDataset";
export type { SyncResult, BatchSyncResult } from "./publicDataset";
