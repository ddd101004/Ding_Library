import prisma from '@/utils/prismaProxy';
import { BrowseHistory } from '@prisma/client';

/**
 * 创建浏览历史
 * @param data 浏览历史数据
 * @returns 浏览历史信息
 */
export async function createBrowseHistory(data: {
  user_id: string;
  browse_type: string;
  paper_id?: string;      // 数据库 UUID
  scholar_id?: string;    // 数据库 UUID
  patent_id?: string;     // 数据库 UUID
}): Promise<BrowseHistory> {
  // 检查是否已存在相同的浏览记录(近期)
  const existing = await prisma.browseHistory.findFirst({
    where: {
      user_id: data.user_id,
      browse_type: data.browse_type,
      ...(data.paper_id && { paper_id: data.paper_id }),
      ...(data.scholar_id && { scholar_id: data.scholar_id }),
      ...(data.patent_id && { patent_id: data.patent_id }),
      create_time: {
        gte: new Date(Date.now() - 60 * 60 * 1000), // 1小时内
      },
    },
  });

  if (existing) {
    // 更新时间
    return await prisma.browseHistory.update({
      where: { id: existing.id },
      data: { update_time: new Date() },
    });
  }

  return await prisma.browseHistory.create({
    data,
  });
}

/**
 * 获取用户浏览历史
 * @param params 查询参数
 * @returns 浏览历史列表和总数
 */
export async function getUserBrowseHistory(params: {
  user_id: string;
  browse_type?: string;
  page?: number;
  size?: number;
}) {
  const { user_id, browse_type, page = 1, size = 20 } = params;

  const where: any = { user_id };
  if (browse_type) {
    where.browse_type = browse_type;
  }

  const [total, items] = await Promise.all([
    prisma.browseHistory.count({ where }),
    prisma.browseHistory.findMany({
      where,
      orderBy: { create_time: 'desc' },
      skip: (page - 1) * size,
      take: size,
    }),
  ]);

  return { total, items };
}

/**
 * 删除浏览历史
 * @param id 浏览历史ID
 * @param user_id 用户ID
 */
export async function deleteBrowseHistory(id: string, user_id: string): Promise<void> {
  await prisma.browseHistory.deleteMany({
    where: { id, user_id },
  });
}

/**
 * 清空用户浏览历史
 * @param user_id 用户ID
 */
export async function clearUserBrowseHistory(user_id: string): Promise<void> {
  await prisma.browseHistory.deleteMany({
    where: { user_id },
  });
}
