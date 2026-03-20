import { batchUpsertWanfangPapers } from "@/db/wanfang/paper";
import { findPaperIdsBySource } from "@/db/paper";
import { WanfangPaperItem } from "@/type/paper";
import logger from "@/helper/logger";

interface WanfangPaperRaw {
  id: string;
  total?: number | string;
  title?: string;
  title_en?: string;
  abstract?: string;
  abstract_en?: string;
  creator?: string[];
  keywords?: string[];
  periodical_title?: string;
  periodical_title_en?: string;
  publish_year?: string;
  doi?: string;
  issn?: string;
  source_db?: string;
}

interface ProcessWanfangResultParams {
  papers: WanfangPaperRaw[];
  size: number;
  isEnglish?: boolean;
}

interface ProcessWanfangResult {
  items: WanfangPaperItem[];
  total: number;
}

/**
 * 处理万方论文搜索结果的通用函数
 * 包含：存储数据库、查询UUID、检查收藏状态、格式化返回
 */
export async function processWanfangSearchResults(
  params: ProcessWanfangResultParams
): Promise<ProcessWanfangResult> {
  const { papers, size, isEnglish = false } = params;

  if (!papers || papers.length === 0) {
    return { items: [], total: 0 };
  }

  // 解析 total（万方 API 可能返回字符串）
  const rawTotal = papers[0]?.total || papers.length;
  const total = typeof rawTotal === "string" ? parseInt(rawTotal, 10) : rawTotal;

  // 存储到数据库
  const source = isEnglish ? "wanfang_en" : "wanfang";
  await batchUpsertWanfangPapers(papers, source).catch((err) =>
    logger.error("批量存储万方论文失败", {
      error: err instanceof Error ? err.message : err,
      isEnglish,
    })
  );

  // 查询数据库 UUID
  const dbPapers = await findPaperIdsBySource(
    source,
    papers.map((p) => p.id)
  );
  const sourceIdToDbIdMap = new Map(dbPapers.map((p) => [p.source_id, p.id]));

  // 格式化返回数据
  const items: WanfangPaperItem[] = papers.slice(0, size).map((paper) => {
    const dbId = sourceIdToDbIdMap.get(paper.id);
    const baseItem: WanfangPaperItem = {
      id: dbId || paper.id,
      source: source,
      source_id: paper.id,
      title: paper.title || "",
      abstract: paper.abstract,
      year: paper.publish_year ? parseInt(paper.publish_year) : undefined,
      authors: paper.creator,
      keywords: paper.keywords,
      periodical_title: paper.periodical_title,
      publish_year: paper.publish_year,
      doi: paper.doi,
      issn: paper.issn,
      source_db: paper.source_db,
      isFavorited: false,
      title_en: paper.title_en,
      abstract_en: paper.abstract_en,
      periodical_title_en: paper.periodical_title_en,
    };

    return baseItem;
  });

  return { items, total };
}
