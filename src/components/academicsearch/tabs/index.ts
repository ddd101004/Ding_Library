/**
 * 学术搜索子组件统一导出 — 将tabs目录下的三个标签页组件和类型集中导出
 *
 * 导出的组件：
 * - ComprehensiveSearchTab — 综合搜索标签页
 * - ChineseDiscoveryTab — 中文发现标签页
 * - ForeignDiscoveryTab — 外文发现标签页
 *
 * 导出的类型：
 * - SearchResult, ComprehensiveSearchResponse（来自types/types.ts）
 *
 * 引用方：
 * - academicsearch/AcademicSearch.tsx
 */
export { default as ComprehensiveSearchTab } from './ComprehensiveSearchTab';
export { default as ChineseDiscoveryTab } from './ChineseDiscoveryTab';
export { default as ForeignDiscoveryTab } from './ForeignDiscoveryTab';
export * from '../../../types/types';