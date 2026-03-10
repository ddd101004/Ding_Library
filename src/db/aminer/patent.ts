import prisma from '@/utils/prismaProxy';
import { Patent } from '@prisma/client';

/**
 * 专利数据输入类型（支持多数据源）
 */
export interface PatentUpsertInput {
  source_id: string;
  source?: 'aminer' | 'wanfang';
  title: string;
  title_zh?: string;
  title_en?: string;
  abstract?: string;
  year?: number;
  app_num?: string;
  pub_num?: string;
  pub_kind?: string;
  country?: string;
  inventors?: string[];
  assignee?: string;
  cpc?: string[];
  ipc?: string[];
  ipcr?: string[];
  description?: string;
  app_date?: string;
  pub_date?: string;
  priority?: string;
  preview_url?: string;
  download_url?: string;
}

/**
 * 根据 AMiner ID 查询专利
 * @param aminerId AMiner专利ID
 * @returns 专利信息或null
 */
export async function findPatentByAminerId(aminerId: string): Promise<Patent | null> {
  return await prisma.patent.findUnique({
    where: {
      source_source_id: {
        source: 'aminer',
        source_id: aminerId
      }
    },
  });
}

/**
 * 根据数据源和源ID查询专利
 * @param source 数据源
 * @param sourceId 源ID
 * @returns 专利信息或null
 */
export async function findPatentBySourceId(
  source: 'aminer' | 'wanfang',
  sourceId: string
): Promise<Patent | null> {
  return await prisma.patent.findUnique({
    where: {
      source_source_id: {
        source,
        source_id: sourceId
      }
    },
  });
}

/**
 * 将日期字符串转换为 Date 对象
 * 支持格式: 'YYYY-MM-DD HH:mm:ss' 或 ISO 格式
 */
function parseDateString(dateStr?: string): Date | undefined {
  if (!dateStr) return undefined;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? undefined : date;
}

/**
 * 创建或更新专利（支持多数据源）
 * @param data 专利数据
 * @param source 数据源（默认 aminer）
 * @returns 专利信息
 */
export async function upsertPatent(
  data: PatentUpsertInput,
  source: 'aminer' | 'wanfang' = 'aminer'
): Promise<Patent> {
  const sourceId = data.source_id;
  const appDate = parseDateString(data.app_date);
  const pubDate = parseDateString(data.pub_date);

  return await prisma.patent.upsert({
    where: {
      source_source_id: {
        source,
        source_id: sourceId
      }
    },
    update: {
      title: data.title,
      title_zh: data.title_zh,
      title_en: data.title_en,
      abstract: data.abstract,
      year: data.year,
      app_num: data.app_num,
      pub_num: data.pub_num,
      pub_kind: data.pub_kind,
      country: data.country,
      inventors: data.inventors,
      assignee: data.assignee,
      cpc: data.cpc,
      ipc: data.ipc,
      ipcr: data.ipcr,
      description: data.description,
      app_date: appDate,
      pub_date: pubDate,
      priority: data.priority,
      preview_url: data.preview_url,
      download_url: data.download_url,
    },
    create: {
      source,
      source_id: sourceId,
      title: data.title,
      title_zh: data.title_zh,
      title_en: data.title_en,
      abstract: data.abstract,
      year: data.year,
      app_num: data.app_num,
      pub_num: data.pub_num,
      pub_kind: data.pub_kind,
      country: data.country,
      inventors: data.inventors,
      assignee: data.assignee,
      cpc: data.cpc,
      ipc: data.ipc,
      ipcr: data.ipcr,
      description: data.description,
      app_date: appDate,
      pub_date: pubDate,
      priority: data.priority,
      preview_url: data.preview_url,
      download_url: data.download_url,
    },
  });
}

/**
 * 批量创建或更新专利
 * 使用 createMany + skipDuplicates 优化批量插入性能
 * 注意：此方法仅插入新记录，已存在的记录会被跳过（不更新）
 * @param patents 专利数据列表
 * @param source 数据源（默认 aminer）
 */
export async function batchUpsertPatents(
  patents: PatentUpsertInput[],
  source: 'aminer' | 'wanfang' = 'aminer'
): Promise<void> {
  if (!patents || patents.length === 0) return;

  // 使用 createMany 批量插入，skipDuplicates 跳过已存在的记录
  await prisma.patent.createMany({
    data: patents.map((data) => ({
      source: data.source || source,
      source_id: data.source_id,
      title: data.title,
      title_zh: data.title_zh,
      title_en: data.title_en,
      abstract: data.abstract,
      year: data.year,
      app_num: data.app_num,
      pub_num: data.pub_num,
      pub_kind: data.pub_kind,
      country: data.country,
      inventors: data.inventors,
      assignee: data.assignee,
      cpc: data.cpc,
      ipc: data.ipc,
      ipcr: data.ipcr,
      description: data.description,
      app_date: parseDateString(data.app_date),
      pub_date: parseDateString(data.pub_date),
      priority: data.priority,
      preview_url: data.preview_url,
      download_url: data.download_url,
    })),
    skipDuplicates: true,
  });
}

/**
 * 根据数据库ID查询专利详情
 * @param id 专利ID（数据库UUID）
 * @returns 专利信息或null
 */
export async function findPatentById(id: string): Promise<Patent | null> {
  return await prisma.patent.findUnique({
    where: { id },
  });
}

/**
 * 批量查询专利（根据AMiner ID列表）
 * @param aminerIds AMiner ID列表
 * @returns 专利列表
 */
export async function findPatentsByAminerIds(aminerIds: string[]): Promise<Patent[]> {
  return await prisma.patent.findMany({
    where: {
      source: 'aminer',
      source_id: { in: aminerIds },
    },
  });
}

/**
 * 批量查询专利（根据数据库UUID列表）
 * @param ids 数据库UUID列表
 * @returns 专利列表
 */
export async function findPatentsByIds(ids: string[]): Promise<Patent[]> {
  return await prisma.patent.findMany({
    where: {
      id: { in: ids },
    },
  });
}

/**
 * 根据AMiner ID获取数据库UUID
 * @param aminerId AMiner ID
 * @returns 数据库UUID或null
 */
export async function getPatentIdByAminerId(aminerId: string): Promise<string | null> {
  const patent = await prisma.patent.findUnique({
    where: {
      source_source_id: {
        source: 'aminer',
        source_id: aminerId
      }
    },
    select: { id: true }
  });
  return patent?.id || null;
}

/**
 * 统计专利数量
 * @param keyword 搜索关键词（可选）
 * @returns 专利数量
 */
export async function countPatents(keyword?: string): Promise<number> {
  const where: any = { source: 'aminer' };

  if (keyword) {
    where.OR = [
      { title: { contains: keyword } },
      { abstract: { contains: keyword } },
    ];
  }

  return await prisma.patent.count({ where });
}

/**
 * 根据数据源和源ID列表批量查询专利ID映射
 * @param source 数据源（aminer, wanfang, cnki）
 * @param sourceIds 源系统ID列表
 * @returns 专利列表（仅包含数据库UUID和源ID）
 */
export async function findPatentIdsBySource(
  source: string,
  sourceIds: string[]
): Promise<Array<{ id: string; source_id: string }>> {
  return await prisma.patent.findMany({
    where: {
      source,
      source_id: { in: sourceIds }
    },
    select: { id: true, source_id: true }
  });
}
