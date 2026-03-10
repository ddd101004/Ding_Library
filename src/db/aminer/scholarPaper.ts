import prisma from "@/utils/prismaProxy";
import { ScholarPaper } from "@prisma/client";

// 特殊标记：表示已查询过但无数据
const NO_DATA_MARKER = "__NO_DATA__";

/**
 * 学者论文关联数据
 */
export interface ScholarPaperData {
  scholar_aminer_id: string;
  paper_aminer_id: string;
  title?: string;
  title_zh?: string;
}

/**
 * 批量保存学者论文关联（来自 AMiner API）
 * 使用 createMany + skipDuplicates 优化批量插入性能
 * @param scholarAminerId 学者的 AMiner ID
 * @param papers 论文列表
 */
export async function batchUpsertScholarPapers(
  scholarAminerId: string,
  papers: Array<{ id: string; title?: string; title_zh?: string }>
): Promise<void> {
  if (!papers || papers.length === 0) return;

  // 使用 createMany 批量插入，skipDuplicates 跳过已存在的记录
  // 相比逐条 upsert，大幅减少数据库操作次数
  await prisma.scholarPaper.createMany({
    data: papers.map((paper) => ({
      scholar_aminer_id: scholarAminerId,
      paper_aminer_id: paper.id,
      title: paper.title,
      title_zh: paper.title_zh,
    })),
    skipDuplicates: true,
  });
}

/**
 * 标记学者论文已查询但无数据
 * @param scholarAminerId 学者的 AMiner ID
 */
export async function markScholarPapersEmpty(
  scholarAminerId: string
): Promise<void> {
  await prisma.scholarPaper.create({
    data: {
      scholar_aminer_id: scholarAminerId,
      paper_aminer_id: NO_DATA_MARKER,
      title: "NO_DATA",
    },
  }).catch(() => {
    // 忽略重复插入错误
  });
}

/**
 * 分页查询学者论文
 * @param scholarAminerId 学者的 AMiner ID
 * @param page 页码（从 1 开始）
 * @param size 每页数量
 * @returns 论文列表和总数
 */
export async function findScholarPapersPaginated(
  scholarAminerId: string,
  page: number = 1,
  size: number = 10
): Promise<{ items: ScholarPaper[]; total: number }> {
  const skip = (page - 1) * size;

  // 排除特殊标记记录
  const whereClause = {
    scholar_aminer_id: scholarAminerId,
    paper_aminer_id: { not: NO_DATA_MARKER },
  };

  const [items, total] = await Promise.all([
    prisma.scholarPaper.findMany({
      where: whereClause,
      orderBy: { create_time: "desc" },
      skip,
      take: size,
    }),
    prisma.scholarPaper.count({
      where: whereClause,
    }),
  ]);

  return { items, total };
}

/**
 * 统计学者论文数量
 * @param scholarAminerId 学者的 AMiner ID
 * @returns 论文数量
 */
export async function countScholarPapers(
  scholarAminerId: string
): Promise<number> {
  return await prisma.scholarPaper.count({
    where: {
      scholar_aminer_id: scholarAminerId,
      paper_aminer_id: { not: NO_DATA_MARKER },
    },
  });
}

/**
 * 检查学者是否有缓存的论文数据（包括空数据标记）
 * @param scholarAminerId 学者的 AMiner ID
 * @returns 是否有缓存
 */
export async function hasScholarPapersCache(
  scholarAminerId: string
): Promise<boolean> {
  const count = await prisma.scholarPaper.count({
    where: { scholar_aminer_id: scholarAminerId },
    take: 1,
  });
  return count > 0;
}
