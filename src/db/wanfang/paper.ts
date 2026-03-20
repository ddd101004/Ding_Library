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
 * - 中文论文: title 优先中文，title_zh 存储英文
 * - 英文论文: title 优先英文，title_zh 存储中文
 * @param data 万方论文数据
 * @param source 数据源：'wanfang' 或 'wanfang_en'
 * @returns 论文信息
 */
export async function upsertWanfangPaper(data: WanfangPaperInput, source: string = 'wanfang'): Promise<Paper> {
  const isEnglish = source === 'wanfang_en';

  // 万方 API 返回的字段：title 可能是中文或英文，title_en 是另一种语言
  const titleField1 = data.title || '';
  const titleField2 = data.title_en || '';
  const abstractField1 = data.abstract || '';
  const abstractField2 = data.abstract_en || '';
  const periodicalField1 = data.periodical_title || '';
  const periodicalField2 = data.periodical_title_en || '';

  // 根据数据源决定主标题和摘要
  let mainTitle, secondaryTitle;
  let mainAbstract, secondaryAbstract;
  let mainPeriodical, secondaryPeriodical;

  if (isEnglish) {
    // 英文论文：title 字段通常是英文
    mainTitle = titleField1;
    secondaryTitle = titleField2;
    mainAbstract = abstractField1;
    secondaryAbstract = abstractField2;
    mainPeriodical = periodicalField1;
    secondaryPeriodical = periodicalField2;
  } else {
    // 中文论文：title_en 字段通常是中文，title 字段可能是英文
    mainTitle = titleField2 || titleField1;
    secondaryTitle = titleField1;
    mainAbstract = abstractField2 || abstractField1;
    secondaryAbstract = abstractField1;
    mainPeriodical = periodicalField2 || periodicalField1;
    secondaryPeriodical = periodicalField1;
  }

  const year = data.publish_year ? parseInt(data.publish_year) : undefined;

  const paperData = {
    title: mainTitle,
    title_zh: secondaryTitle,
    abstract: mainAbstract,
    abstract_zh: secondaryAbstract,
    publication_name: mainPeriodical,
    doi: data.doi,
    publication_year: year,
    language: isEnglish ? 'en' : 'zh',
    keywords: data.keywords,
    venue: secondaryPeriodical ? {
      raw: mainPeriodical,
      raw_zh: secondaryPeriodical
    } : undefined,
    authors: data.creator?.map((name: string) => ({ name })),
    issn: data.issn,
    update_time: new Date(),
  };

  return await prisma.paper.upsert({
    where: {
      source_source_id: {
        source: source,
        source_id: data.id
      }
    },
    update: paperData,
    create: {
      source: source,
      source_id: data.id,
      ...paperData,
    },
  });
}

/**
 * 批量创建或更新万方论文
 * 使用 createMany + skipDuplicates 优化批量插入性能
 * 注意：此方法仅插入新记录，已存在的记录会被跳过（不更新）
 * 存储策略：
 * - 中文论文 (source='wanfang'): title 优先中文，无中文则用英文
 * - 英文论文 (source='wanfang_en'): title 优先英文，无英文则用中文
 * - title_zh: 始终存储中文标题
 * - abstract: 同 title 逻辑
 * - abstract_zh: 始终存储中文摘要
 * @param papers 万方论文数据列表
 * @param source 数据源：'wanfang' 或 'wanfang_en'
 */
export async function batchUpsertWanfangPapers(papers: WanfangPaperInput[], source: string = 'wanfang'): Promise<void> {
  if (!papers || papers.length === 0) return;

  // 判断数据源类型
  const isEnglish = source === 'wanfang_en';

  await prisma.paper.createMany({
    data: papers.map((data) => {
      // 万方 API 返回的字段：title 可能是中文或英文，title_en 是另一种语言
      // 实际情况：对于中文论文，title 可能是英文，title_en 可能是中文
      const titleField1 = data.title || '';
      const titleField2 = data.title_en || '';
      const abstractField1 = data.abstract || '';
      const abstractField2 = data.abstract_en || '';
      const periodicalField1 = data.periodical_title || '';
      const periodicalField2 = data.periodical_title_en || '';

      // 根据数据源决定主标题和摘要
      // 中文论文：优先使用 titleField2（可能是中文），否则使用 titleField1
      // 英文论文：优先使用 titleField1（可能是英文），否则使用 titleField2
      let mainTitle, secondaryTitle;
      let mainAbstract, secondaryAbstract;
      let mainPeriodical, secondaryPeriodical;

      if (isEnglish) {
        // 英文论文：title 字段通常是英文
        mainTitle = titleField1;
        secondaryTitle = titleField2;
        mainAbstract = abstractField1;
        secondaryAbstract = abstractField2;
        mainPeriodical = periodicalField1;
        secondaryPeriodical = periodicalField2;
      } else {
        // 中文论文：title_en 字段通常是中文，title 字段可能是英文
        mainTitle = titleField2 || titleField1;
        secondaryTitle = titleField1;
        mainAbstract = abstractField2 || abstractField1;
        secondaryAbstract = abstractField1;
        mainPeriodical = periodicalField2 || periodicalField1;
        secondaryPeriodical = periodicalField1;
      }

      const year = data.publish_year ? parseInt(data.publish_year) : undefined;

      return {
        source: source,
        source_id: data.id,
        title: mainTitle,
        title_zh: secondaryTitle,
        abstract: mainAbstract,
        abstract_zh: secondaryAbstract,
        publication_name: mainPeriodical,
        doi: data.doi,
        publication_year: year,
        language: isEnglish ? 'en' : 'zh',
        keywords: data.keywords,
        venue: secondaryPeriodical ? {
          raw: mainPeriodical,
          raw_zh: secondaryPeriodical
        } : undefined,
        authors: data.creator?.map((name: string) => ({ name })),
        issn: data.issn,
        update_time: new Date(),
      };
    }),
    skipDuplicates: true,
  });
}
