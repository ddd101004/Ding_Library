import prisma from '@/utils/prismaProxy';
import { Paper } from '@prisma/client';

interface WanfangPaperInput {
  id: string;
  title?: string;
  title_en?: string;
  abstract?: string;
  abstract_en?: string;
  doi?: string;
  publish_year?: string;
  keywords?: string[];
  periodical_title?: string;
  periodical_title_en?: string;
  creator?: string[];
  issn?: string;
}

/**
 * 创建或更新万方论文
 * 存储策略：
 * - title: 优先存英文，无英文则存中文
 * - title_zh: 中文标题
 * - abstract: 优先存英文，无英文则存中文
 * - abstract_zh: 中文摘要
 * - publication_name: 优先存英文，无英文则存中文
 * @param data 万方论文数据
 * @returns 论文信息
 */
export async function upsertWanfangPaper(data: WanfangPaperInput): Promise<Paper> {
  const titleZh = data.title || '';
  const titleEn = data.title_en || '';
  const abstractZh = data.abstract || '';
  const abstractEn = data.abstract_en || '';
  const periodicalZh = data.periodical_title || '';
  const periodicalEn = data.periodical_title_en || '';

  const year = data.publish_year ? parseInt(data.publish_year) : undefined;

  return await prisma.paper.upsert({
    where: {
      source_source_id: {
        source: 'wanfang',
        source_id: data.id
      }
    },
    update: {
      title: titleEn || titleZh,
      title_zh: titleZh,
      abstract: abstractEn || abstractZh,
      abstract_zh: abstractZh,
      publication_name: periodicalEn || periodicalZh,
      doi: data.doi,
      publication_year: year,
      language: 'zh',
      keywords: data.keywords,
      venue: periodicalZh ? {
        raw: periodicalEn || periodicalZh,
        raw_zh: periodicalZh
      } : undefined,
      authors: data.creator?.map((name: string) => ({ name })),
      issn: data.issn,
      update_time: new Date(),
    },
    create: {
      source: 'wanfang',
      source_id: data.id,
      title: titleEn || titleZh,
      title_zh: titleZh,
      abstract: abstractEn || abstractZh,
      abstract_zh: abstractZh,
      publication_name: periodicalEn || periodicalZh,
      doi: data.doi,
      publication_year: year,
      language: 'zh',
      keywords: data.keywords,
      venue: periodicalZh ? {
        raw: periodicalEn || periodicalZh,
        raw_zh: periodicalZh
      } : undefined,
      authors: data.creator?.map((name: string) => ({ name })),
      issn: data.issn,
      update_time: new Date(),
    },
  });
}

/**
 * 批量创建或更新万方论文
 * 使用 createMany + skipDuplicates 优化批量插入性能
 * 注意：此方法仅插入新记录，已存在的记录会被跳过（不更新）
 * 存储策略：
 * - title: 优先存英文，无英文则存中文
 * - title_zh: 中文标题
 * - abstract: 优先存英文，无英文则存中文
 * - abstract_zh: 中文摘要
 * - publication_name: 优先存英文，无英文则存中文
 * @param papers 万方论文数据列表
 * @param source 数据源：'wanfang' 或 'wanfang_en'
 */
export async function batchUpsertWanfangPapers(papers: WanfangPaperInput[], source: string = 'wanfang'): Promise<void> {
  if (!papers || papers.length === 0) return;

  await prisma.paper.createMany({
    data: papers.map((data) => {
      const titleZh = data.title || '';
      const titleEn = data.title_en || '';
      const abstractZh = data.abstract || '';
      const abstractEn = data.abstract_en || '';
      const periodicalZh = data.periodical_title || '';
      const periodicalEn = data.periodical_title_en || '';

      const year = data.publish_year ? parseInt(data.publish_year) : undefined;

      return {
        source: source,
        source_id: data.id,
        title: titleEn || titleZh,
        title_zh: titleZh,
        abstract: abstractEn || abstractZh,
        abstract_zh: abstractZh,
        publication_name: periodicalEn || periodicalZh,
        doi: data.doi,
        publication_year: year,
        language: 'zh',
        keywords: data.keywords,
        venue: periodicalZh ? {
          raw: periodicalEn || periodicalZh,
          raw_zh: periodicalZh
        } : undefined,
        authors: data.creator?.map((name: string) => ({ name })),
        issn: data.issn,
        update_time: new Date(),
      };
    }),
    skipDuplicates: true,
  });
}
