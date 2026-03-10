import prisma from '@/utils/prismaProxy';
import { Scholar } from '@prisma/client';

/**
 * 根据 AMiner ID 查询学者
 * @param aminerId AMiner学者ID
 * @returns 学者信息或null
 */
export async function findScholarByAminerId(aminerId: string): Promise<Scholar | null> {
  return await prisma.scholar.findUnique({
    where: {
      source_source_id: {
        source: 'aminer',
        source_id: aminerId
      }
    },
  });
}

/**
 * 创建或更新学者
 * @param data AMiner学者数据
 * @returns 学者信息
 */
export async function upsertScholar(data: any): Promise<Scholar> {
  return await prisma.scholar.upsert({
    where: {
      source_source_id: {
        source: 'aminer',
        source_id: data.aminer_id
      }
    },
    update: {
      name: data.name,
      name_zh: data.name_zh,
      orgs: data.orgs,
      org_zhs: data.org_zhs,
      position: data.position,
      position_zh: data.position_zh,
      bio: data.bio,
      bio_zh: data.bio_zh,
      edu: data.edu,
      edu_zh: data.edu_zh,
      interests: data.interests,
      honor: data.honor,
      n_citation: data.n_citation,
      h_index: data.h_index,
      // 学者画像结构化数据
      edus: data.edus,
      works: data.works,
      ai_domain: data.ai_domain,
      ai_interests: data.ai_interests,
    },
    create: {
      source: 'aminer',
      source_id: data.aminer_id,
      name: data.name,
      name_zh: data.name_zh,
      orgs: data.orgs,
      org_zhs: data.org_zhs,
      position: data.position,
      position_zh: data.position_zh,
      bio: data.bio,
      bio_zh: data.bio_zh,
      edu: data.edu,
      edu_zh: data.edu_zh,
      interests: data.interests,
      honor: data.honor,
      n_citation: data.n_citation,
      h_index: data.h_index,
      // 学者画像结构化数据
      edus: data.edus,
      works: data.works,
      ai_domain: data.ai_domain,
      ai_interests: data.ai_interests,
    },
  });
}

/**
 * 批量创建或更新学者
 * 使用 createMany + skipDuplicates 优化批量插入性能
 * 注意：此方法仅插入新记录，已存在的记录会被跳过（不更新）
 * @param scholars AMiner学者数据列表
 */
export async function batchUpsertScholars(scholars: any[]): Promise<void> {
  if (!scholars || scholars.length === 0) return;

  // 过滤并转换数据：name 是必填字段，如果为空则使用 name_zh 作为备选
  const validScholars = scholars
    .filter((data) => {
      // 必须有 aminer_id 和至少一个名称字段
      return data.aminer_id && (data.name || data.name_zh);
    })
    .map((data) => ({
      source: 'aminer',
      source_id: data.aminer_id,
      // name 是必填字段，优先使用 name，否则使用 name_zh
      name: data.name || data.name_zh,
      name_zh: data.name_zh,
      orgs: data.orgs,
      org_zhs: data.org_zhs,
      position: data.position,
      position_zh: data.position_zh,
      bio: data.bio,
      bio_zh: data.bio_zh,
      edu: data.edu,
      edu_zh: data.edu_zh,
      interests: data.interests,
      honor: data.honor,
      n_citation: data.n_citation,
      h_index: data.h_index,
      edus: data.edus,
      works: data.works,
      ai_domain: data.ai_domain,
      ai_interests: data.ai_interests,
    }));

  if (validScholars.length === 0) return;

  // 使用 createMany 批量插入，skipDuplicates 跳过已存在的记录
  await prisma.scholar.createMany({
    data: validScholars,
    skipDuplicates: true,
  });
}

/**
 * 根据数据库ID查询学者详情
 * @param id 学者ID（数据库UUID）
 * @returns 学者信息或null
 */
export async function findScholarById(id: string): Promise<Scholar | null> {
  return await prisma.scholar.findUnique({
    where: { id },
  });
}

/**
 * 批量查询学者（根据AMiner ID列表）
 * @param aminerIds AMiner ID列表
 * @returns 学者列表
 */
export async function findScholarsByAminerIds(aminerIds: string[]): Promise<Scholar[]> {
  return await prisma.scholar.findMany({
    where: {
      source: 'aminer',
      source_id: { in: aminerIds },
    },
  });
}

/**
 * 批量查询学者（根据数据库UUID列表）
 * @param ids 数据库UUID列表
 * @returns 学者列表
 */
export async function findScholarsByIds(ids: string[]): Promise<Scholar[]> {
  return await prisma.scholar.findMany({
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
export async function getScholarIdByAminerId(aminerId: string): Promise<string | null> {
  const scholar = await prisma.scholar.findUnique({
    where: {
      source_source_id: {
        source: 'aminer',
        source_id: aminerId
      }
    },
    select: { id: true }
  });
  return scholar?.id || null;
}

/**
 * 统计学者数量
 * @param keyword 搜索关键词（可选）
 * @returns 学者数量
 */
export async function countScholars(keyword?: string): Promise<number> {
  const where: any = { source: 'aminer' };

  if (keyword) {
    where.OR = [
      { name: { contains: keyword } },
      { name_zh: { contains: keyword } },
    ];
  }

  return await prisma.scholar.count({ where });
}

/**
 * 根据数据源和源ID列表批量查询学者ID映射
 * @param source 数据源（aminer, wanfang, cnki）
 * @param sourceIds 源系统ID列表
 * @returns 学者列表（仅包含数据库UUID和源ID）
 */
export async function findScholarIdsBySource(
  source: string,
  sourceIds: string[]
): Promise<Array<{ id: string; source_id: string }>> {
  return await prisma.scholar.findMany({
    where: {
      source,
      source_id: { in: sourceIds }
    },
    select: { id: true, source_id: true }
  });
}
