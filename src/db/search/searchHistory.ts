import prisma from '@/utils/prismaProxy';
import { SearchHistory, Prisma } from '@prisma/client';

/**
 * 创建搜索历史
 * @param data 搜索历史数据
 * @returns 搜索历史信息
 */
export async function createSearchHistory(data: {
  user_id: string;
  keyword: string;
  search_type: string;
  result_count?: number;
  paper_id?: string;      // 数据库 UUID
  scholar_id?: string;    // 数据库 UUID
  patent_id?: string;     // 数据库 UUID
}): Promise<SearchHistory> {
  return await prisma.searchHistory.create({
    data,
  });
}

/**
 * 获取用户搜索历史（按搜索词去重，保留最新记录）
 * 使用 SQL 原生查询优化，避免全量查询后在内存中去重
 * @param params 查询参数
 * @returns 搜索历史列表和总数
 */
export async function getUserSearchHistory(params: {
  user_id: string;
  search_type?: string;
  page?: number;
  size?: number;
}) {
  const { user_id, search_type, page = 1, size = 20 } = params;
  const offset = (page - 1) * size;

  try {
    // 使用子查询获取每组 (keyword, search_type) 的最新记录
    const results: SearchHistory[] = await prisma.$queryRaw`
      SELECT sh.*
      FROM search_history sh
      INNER JOIN (
        SELECT keyword, search_type, MAX(create_time) as max_time
        FROM search_history
        WHERE user_id = ${user_id}
          AND deleted_status = 0
          ${search_type ? Prisma.sql`AND search_type = ${search_type}` : Prisma.empty}
        GROUP BY keyword, search_type
      ) latest ON sh.keyword = latest.keyword
              AND sh.search_type = latest.search_type
              AND sh.create_time = latest.max_time
      WHERE sh.user_id = ${user_id}
        AND sh.deleted_status = 0
        ${search_type ? Prisma.sql`AND sh.search_type = ${search_type}` : Prisma.empty}
      ORDER BY sh.create_time DESC
      LIMIT ${size} OFFSET ${offset}
    `;

    // 获取去重后的总数
    const countResult: Array<{ total: bigint }> = await prisma.$queryRaw`
      SELECT COUNT(*) as total
      FROM (
        SELECT DISTINCT keyword, search_type
        FROM search_history
        WHERE user_id = ${user_id}
          AND deleted_status = 0
          ${search_type ? Prisma.sql`AND search_type = ${search_type}` : Prisma.empty}
      ) as unique_searches
    `;

    const total = Number(countResult[0]?.total || 0);

    return { total, items: results };
  } catch (error) {
    // 查询失败时回退到内存去重方案
    const allRecords = await prisma.searchHistory.findMany({
      where: {
        user_id,
        deleted_status: 0,
        ...(search_type && { search_type }),
      },
      orderBy: { create_time: 'desc' },
    });

    const uniqueMap = new Map<string, SearchHistory>();
    for (const record of allRecords) {
      const key = `${record.keyword}|${record.search_type}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, record);
      }
    }

    const uniqueItems = Array.from(uniqueMap.values());
    const total = uniqueItems.length;
    const items = uniqueItems.slice((page - 1) * size, page * size);

    return { total, items };
  }
}

/**
 * 删除搜索历史（软删除）
 * @param id 搜索历史ID
 * @param user_id 用户ID
 */
export async function deleteSearchHistory(id: string, user_id: string): Promise<void> {
  await prisma.searchHistory.updateMany({
    where: { id, user_id },
    data: {
      deleted_status: 1,
      deleted_time: new Date(),
    },
  });
}

/**
 * 按搜索词批量删除搜索历史（软删除）
 * @param keyword 搜索词
 * @param user_id 用户ID
 */
export async function deleteSearchHistoryByKeyword(keyword: string, user_id: string): Promise<void> {
  await prisma.searchHistory.updateMany({
    where: { keyword, user_id, deleted_status: 0 },
    data: {
      deleted_status: 1,
      deleted_time: new Date(),
    },
  });
}

/**
 * 清空用户搜索历史（软删除）
 * @param user_id 用户ID
 */
export async function clearUserSearchHistory(user_id: string): Promise<void> {
  await prisma.searchHistory.updateMany({
    where: { user_id, deleted_status: 0 },
    data: {
      deleted_status: 1,
      deleted_time: new Date(),
    },
  });
}
