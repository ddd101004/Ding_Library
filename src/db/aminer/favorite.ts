import prisma from '@/utils/prismaProxy';
import { Favorite, Prisma } from '@prisma/client';

/**
 * 收藏类型
 */
export type FavoriteType = 'paper' | 'scholar' | 'patent';

/**
 * 收藏字段映射
 */
type FavoriteFieldKey = 'paper_id' | 'scholar_id' | 'patent_id';

/**
 * 添加收藏
 * @param data 收藏数据
 * @returns 收藏信息
 */
export async function addFavorite(data: {
  user_id: string;
  favorite_type: string;
  paper_id?: string;      // 数据库 UUID
  scholar_id?: string;    // 数据库 UUID
  patent_id?: string;     // 数据库 UUID
}): Promise<Favorite> {
  return await prisma.favorite.create({
    data,
  });
}

/**
 * 取消收藏
 * @param id 收藏ID
 * @param user_id 用户ID
 */
export async function removeFavorite(id: string, user_id: string): Promise<void> {
  await prisma.favorite.deleteMany({
    where: { id, user_id },
  });
}

/**
 * 根据类型和数据库ID取消收藏
 * @param user_id 用户ID
 * @param favorite_type 收藏类型
 * @param item_db_id 项目数据库ID（数据库UUID）
 */
export async function removeFavoriteByItem(
  user_id: string,
  favorite_type: string,
  item_db_id: string
): Promise<void> {
  const where: Prisma.FavoriteWhereInput = { user_id, favorite_type };

  if (favorite_type === 'paper') {
    where.paper_id = item_db_id;
  } else if (favorite_type === 'scholar') {
    where.scholar_id = item_db_id;
  } else if (favorite_type === 'patent') {
    where.patent_id = item_db_id;
  }

  await prisma.favorite.deleteMany({ where });
}

/**
 * 检查是否已收藏（使用数据库UUID）
 * @param params 查询参数
 * @returns 是否已收藏
 */
export async function checkFavorite(params: {
  user_id: string;
  favorite_type: string;
  paper_id?: string;      // 数据库 UUID
  scholar_id?: string;    // 数据库 UUID
  patent_id?: string;     // 数据库 UUID
}): Promise<boolean> {
  const count = await prisma.favorite.count({
    where: params,
  });
  return count > 0;
}

/**
 * 获取用户收藏列表
 * @param params 查询参数
 * @returns 收藏列表和总数
 */
export async function getUserFavorites(params: {
  user_id: string;
  favorite_type?: string;
  page?: number;
  size?: number;
}) {
  const { user_id, favorite_type, page = 1, size = 20 } = params;

  const where: Prisma.FavoriteWhereInput = { user_id };
  if (favorite_type) {
    where.favorite_type = favorite_type;
  }

  const [total, items] = await Promise.all([
    prisma.favorite.count({ where }),
    prisma.favorite.findMany({
      where,
      orderBy: { create_time: 'desc' },
      skip: (page - 1) * size,
      take: size,
    }),
  ]);

  return { total, items };
}

/**
 * 批量检查收藏状态（直接使用数据库 UUID，支持多数据源）
 * @param params 查询参数
 * @returns 收藏状态映射表（数据库 UUID -> 是否收藏）
 */
export async function batchCheckFavorites(params: {
  user_id: string;
  favorite_type: string;
  item_ids: string[];  // 数据库 UUID 列表
}): Promise<Record<string, boolean>> {
  const { user_id, favorite_type, item_ids } = params;

  if (item_ids.length === 0) {
    return {};
  }

  // 构建查询条件
  const field = `${favorite_type}_id` as FavoriteFieldKey;
  const favorites = await prisma.favorite.findMany({
    where: {
      user_id,
      favorite_type,
      [field]: { in: item_ids },
    },
    select: { [field]: true },
  });

  // 创建收藏状态映射
  const favoriteSet = new Set(
    favorites.map((f: { [K in FavoriteFieldKey]?: string | null }) => f[field])
  );

  const favoriteMap: Record<string, boolean> = {};
  item_ids.forEach((itemId) => {
    favoriteMap[itemId] = favoriteSet.has(itemId);
  });

  return favoriteMap;
}
