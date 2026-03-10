import prisma from '@/utils/prismaProxy';
import { Paper } from '@prisma/client';

/**
 * 创建或更新 EBSCO 论文
 * @param data EBSCO 论文数据
 * @returns 论文信息
 */
export async function upsertEbscoPaper(data: any): Promise<Paper> {
  // AN (Accession Number) 作为唯一标识
  const an = data.source_id || data.id;

  // 确保 title 不为空
  const title = data.title || '';

  // publication_name 字段（从 journal 或 publication_name 获取）
  const publicationName = data.publication_name;

  // 从内部字段获取 year 和 db_id
  const year = data._year || data.year;
  const db_id = data._db_id || data.db_id;

  // 处理 keywords：确保是 JSON 格式
  const keywords = Array.isArray(data.keywords) ? data.keywords : null;

  return await prisma.paper.upsert({
    where: {
      source_source_id: {
        source: 'ebsco',
        source_id: an
      }
    },
    update: {
      title: title,
      abstract: data.abstract,
      authors: data.authors,
      keywords: keywords,
      doi: data.doi || null,
      issn: data.issn || null,
      volume: data.volume || null,
      issue: data.issue || null,
      subjects: data.subjects || null,
      publication_year: year,
      publication_date: data.publication_date ? new Date(data.publication_date) : null,
      publication_name: publicationName,
      db_id: db_id,
      has_fulltext: data.has_fulltext || false,
      fulltext_link: data.fulltext_link,
      plink: data.plink,
      n_citation: data.n_citation || 0,
      language: 'en', // EBSCO 主要是英文文献
      update_time: new Date(),
    },
    create: {
      source: 'ebsco',
      source_id: an,
      title: title,
      abstract: data.abstract,
      authors: data.authors,
      keywords: keywords,
      doi: data.doi || null,
      issn: data.issn || null,
      volume: data.volume || null,
      issue: data.issue || null,
      subjects: data.subjects || null,
      publication_year: year,
      publication_date: data.publication_date ? new Date(data.publication_date) : null,
      publication_name: publicationName,
      db_id: db_id,
      has_fulltext: data.has_fulltext || false,
      fulltext_link: data.fulltext_link,
      plink: data.plink,
      n_citation: data.n_citation || 0,
      language: 'en',
      update_time: new Date(),
    },
  });
}

/**
 * 批量创建或更新 EBSCO 论文
 * 使用 createMany + skipDuplicates 优化批量插入性能
 * 注意：此方法仅插入新记录，已存在的记录会被跳过（不更新）
 * @param papers EBSCO 论文数据列表
 */
export async function batchUpsertEbscoPapers(papers: any[]): Promise<void> {
  if (!papers || papers.length === 0) return;

  // 使用 createMany 批量插入，skipDuplicates 跳过已存在的记录
  await prisma.paper.createMany({
    data: papers.map((data) => {
      const an = data.source_id || data.id;
      const title = data.title || '';
      const publicationName = data.publication_name;
      const year = data._year || data.year;
      const db_id = data._db_id || data.db_id;
      const keywords = Array.isArray(data.keywords) ? data.keywords : null;

      return {
        source: 'ebsco',
        source_id: an,
        title: title,
        abstract: data.abstract,
        authors: data.authors,
        keywords: keywords,
        doi: data.doi || null,
        issn: data.issn || null,
        volume: data.volume || null,
        issue: data.issue || null,
        subjects: data.subjects || null,
        publication_year: year,
        publication_date: data.publication_date ? new Date(data.publication_date) : null,
        publication_name: publicationName,
        db_id: db_id,
        has_fulltext: data.has_fulltext || false,
        fulltext_link: data.fulltext_link,
        plink: data.plink,
        n_citation: data.n_citation || 0,
        language: 'en',
        update_time: new Date(),
      };
    }),
    skipDuplicates: true,
  });
}
