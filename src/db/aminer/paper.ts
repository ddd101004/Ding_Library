import prisma from '@/utils/prismaProxy';
import { Paper, Prisma } from '@prisma/client';

/**
 * Prisma JSON 输入类型
 * 用于确保 JSON 字段的类型兼容性
 */
type JsonInput = Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined;

/**
 * AMiner论文数据输入类型
 * 用于 upsertPaper 和 batchUpsertPapers 函数
 */
export interface AMinerPaperInput {
  aminer_id: string;
  title?: string;
  title_zh?: string;
  abstract?: string;
  abstract_zh?: string;
  doi?: string;
  year?: number;
  keywords?: JsonInput;
  keywords_zh?: JsonInput;
  venue?: JsonInput;
  authors?: JsonInput;
  issn?: string;
  issue?: string;
  volume?: string;
  n_citation?: number;
  language?: string; // 语言类型
  total?: number; // 搜索结果总数（非数据库字段）
}

/**
 * 根据 AMiner ID 查询论文
 * @param aminerId AMiner论文ID
 * @returns 论文信息或null
 */
export async function findPaperByAminerId(aminerId: string): Promise<Paper | null> {
  return await prisma.paper.findUnique({
    where: {
      source_source_id: {
        source: 'aminer',
        source_id: aminerId
      }
    },
  });
}

/**
 * 创建或更新论文
 * @param data AMiner论文数据
 * @returns 论文信息
 */
export async function upsertPaper(data: AMinerPaperInput): Promise<Paper> {
  // 判断语言（根据是否有中文字段）
  const language = data.title_zh ? 'zh' : 'en';

  // 确保 title 不为空，优先使用英文标题，否则使用中文标题
  const title = data.title || data.title_zh || '';

  return await prisma.paper.upsert({
    where: {
      source_source_id: {
        source: 'aminer',
        source_id: data.aminer_id
      }
    },
    update: {
      title: title,
      title_zh: data.title_zh,
      abstract: data.abstract,
      abstract_zh: data.abstract_zh,
      doi: data.doi,
      publication_year: data.year,
      language: language,
      keywords: data.keywords,
      keywords_zh: data.keywords_zh,
      venue: data.venue,
      authors: data.authors,
      issn: data.issn,
      issue: data.issue,
      volume: data.volume,
      n_citation: data.n_citation,
      update_time: new Date(),
    },
    create: {
      source: 'aminer',
      source_id: data.aminer_id,
      title: title,
      title_zh: data.title_zh,
      abstract: data.abstract,
      abstract_zh: data.abstract_zh,
      doi: data.doi,
      publication_year: data.year,
      language: language,
      keywords: data.keywords,
      keywords_zh: data.keywords_zh,
      venue: data.venue,
      authors: data.authors,
      issn: data.issn,
      issue: data.issue,
      volume: data.volume,
      n_citation: data.n_citation,
      update_time: new Date(),
    },
  });
}

/**
 * 批量创建或更新论文
 * 使用 createMany + skipDuplicates 优化批量插入性能
 * 注意：此方法仅插入新记录，已存在的记录会被跳过（不更新）
 * @param papers AMiner论文数据列表
 */
export async function batchUpsertPapers(papers: AMinerPaperInput[]): Promise<void> {
  if (!papers || papers.length === 0) return;

  // 使用 createMany 批量插入，skipDuplicates 跳过已存在的记录
  await prisma.paper.createMany({
    data: papers.map((paper) => {
      const language = paper.title_zh ? 'zh' : 'en';
      const title = paper.title || paper.title_zh || '';

      return {
        source: 'aminer',
        source_id: paper.aminer_id,
        title: title,
        title_zh: paper.title_zh,
        abstract: paper.abstract,
        abstract_zh: paper.abstract_zh,
        doi: paper.doi,
        publication_year: paper.year,
        language: language,
        keywords: paper.keywords,
        keywords_zh: paper.keywords_zh,
        venue: paper.venue,
        authors: paper.authors,
        issn: paper.issn,
        issue: paper.issue,
        volume: paper.volume,
        n_citation: paper.n_citation,
        update_time: new Date(),
      };
    }),
    skipDuplicates: true,
  });
}

/**
 * 根据数据库ID查询论文详情
 * @param id 论文ID（数据库UUID）
 * @returns 论文信息或null
 */
export async function findPaperById(id: string): Promise<Paper | null> {
  return await prisma.paper.findUnique({
    where: { id },
  });
}

/**
 * 批量查询论文（根据AMiner ID列表）
 * @param aminerIds AMiner ID列表
 * @returns 论文列表
 */
export async function findPapersByAminerIds(aminerIds: string[]): Promise<Paper[]> {
  return await prisma.paper.findMany({
    where: {
      source: 'aminer',
      source_id: { in: aminerIds },
    },
  });
}

/**
 * 批量查询论文（根据数据库UUID列表）
 * @param ids 数据库UUID列表
 * @returns 论文列表
 */
export async function findPapersByIds(ids: string[]): Promise<Paper[]> {
  return await prisma.paper.findMany({
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
export async function getPaperIdByAminerId(aminerId: string): Promise<string | null> {
  const paper = await prisma.paper.findUnique({
    where: {
      source_source_id: {
        source: 'aminer',
        source_id: aminerId
      }
    },
    select: { id: true }
  });
  return paper?.id || null;
}

/**
 * 统计论文数量（按语言）
 * @param language 语言类型 'zh' | 'en' | undefined
 * @param keyword 搜索关键词（可选）
 * @returns 论文数量
 */
export async function countPapers(language?: string, keyword?: string): Promise<number> {
  const where: Prisma.PaperWhereInput = { source: 'aminer' };

  if (language) {
    where.language = language;
  }

  if (keyword) {
    where.OR = [
      { title: { contains: keyword } },
      { title_zh: { contains: keyword } },
      { abstract: { contains: keyword } },
      { abstract_zh: { contains: keyword } },
    ];
  }

  return await prisma.paper.count({ where });
}

/**
 * 查询相关论文用于标签统计（支持所有数据源：aminer、wanfang、ebsco）
 * @param keyword 搜索关键词
 * @param limit 最多查询数量
 * @returns 论文列表（仅包含统计所需字段）
 */
export async function findPapersForTagStats(keyword: string, limit: number = 500) {
  return await prisma.paper.findMany({
    where: {
      OR: [
        { title: { contains: keyword } },
        { title_zh: { contains: keyword } },
        { abstract: { contains: keyword } },
        { abstract_zh: { contains: keyword } },
      ],
    },
    select: {
      source: true,
      keywords: true,
      keywords_zh: true,
      venue: true,
      authors: true,
      publication_name: true,
      subjects: true,
    },
    take: limit,
  });
}

/**
 * 根据数据源和源ID列表批量查询论文ID映射
 * @param source 数据源（aminer, ebsco, wanfang）
 * @param sourceIds 源系统ID列表
 * @returns 论文列表（仅包含数据库UUID和源ID）
 */
export async function findPaperIdsBySource(
  source: string,
  sourceIds: string[]
): Promise<Array<{ id: string; source_id: string }>> {
  return await prisma.paper.findMany({
    where: {
      source,
      source_id: { in: sourceIds }
    },
    select: { id: true, source_id: true }
  });
}
