import prisma from "@/utils/prismaProxy";
import { ScholarPatentRelation } from "@prisma/client";

// 特殊标记：表示已查询过但无数据
const NO_DATA_MARKER = "__NO_DATA__";

/**
 * 学者专利关联数据
 */
export interface ScholarPatentData {
  scholar_aminer_id: string;
  patent_aminer_id: string;
  title?: string;
  title_zh?: string;
}

/**
 * 批量保存学者专利关联（来自 AMiner API）
 * 使用 createMany + skipDuplicates 优化批量插入性能
 * @param scholarAminerId 学者的 AMiner ID
 * @param patents 专利列表
 */
export async function batchUpsertScholarPatents(
  scholarAminerId: string,
  patents: Array<{ id: string; title?: string; title_zh?: string }>
): Promise<void> {
  if (!patents || patents.length === 0) return;

  // 使用 createMany 批量插入，skipDuplicates 跳过已存在的记录
  // 相比逐条 upsert，大幅减少数据库操作次数
  await prisma.scholarPatentRelation.createMany({
    data: patents.map((patent) => ({
      scholar_aminer_id: scholarAminerId,
      patent_aminer_id: patent.id,
      title: patent.title,
      title_zh: patent.title_zh,
    })),
    skipDuplicates: true,
  });
}

/**
 * 标记学者专利已查询但无数据
 * @param scholarAminerId 学者的 AMiner ID
 */
export async function markScholarPatentsEmpty(
  scholarAminerId: string
): Promise<void> {
  await prisma.scholarPatentRelation.create({
    data: {
      scholar_aminer_id: scholarAminerId,
      patent_aminer_id: NO_DATA_MARKER,
      title: "NO_DATA",
    },
  }).catch(() => {
    // 忽略重复插入错误
  });
}

/**
 * 分页查询学者专利
 * @param scholarAminerId 学者的 AMiner ID
 * @param page 页码（从 1 开始）
 * @param size 每页数量
 * @returns 专利列表和总数
 */
export async function findScholarPatentsPaginated(
  scholarAminerId: string,
  page: number = 1,
  size: number = 10
): Promise<{ items: ScholarPatentRelation[]; total: number }> {
  const skip = (page - 1) * size;

  // 排除特殊标记记录
  const whereClause = {
    scholar_aminer_id: scholarAminerId,
    patent_aminer_id: { not: NO_DATA_MARKER },
  };

  const [items, total] = await Promise.all([
    prisma.scholarPatentRelation.findMany({
      where: whereClause,
      orderBy: { create_time: "desc" },
      skip,
      take: size,
    }),
    prisma.scholarPatentRelation.count({
      where: whereClause,
    }),
  ]);

  return { items, total };
}

/**
 * 统计学者专利数量
 * @param scholarAminerId 学者的 AMiner ID
 * @returns 专利数量
 */
export async function countScholarPatents(
  scholarAminerId: string
): Promise<number> {
  return await prisma.scholarPatentRelation.count({
    where: {
      scholar_aminer_id: scholarAminerId,
      patent_aminer_id: { not: NO_DATA_MARKER },
    },
  });
}

/**
 * 检查学者是否有缓存的专利数据（包括空数据标记）
 * @param scholarAminerId 学者的 AMiner ID
 * @returns 是否有缓存
 */
export async function hasScholarPatentsCache(
  scholarAminerId: string
): Promise<boolean> {
  const count = await prisma.scholarPatentRelation.count({
    where: { scholar_aminer_id: scholarAminerId },
    take: 1,
  });
  return count > 0;
}
