import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import {
  addFavorite,
  removeFavoriteByItem,
  getUserFavorites,
  FavoriteType,
} from "@/db/aminer/favorite";
import { findPapersByIds } from "@/db/aminer/paper";
import { findScholarsByIds } from "@/db/aminer/scholar";
import { findPatentsByIds } from "@/db/aminer/patent";
import { parsePageNumber, parseLimitParam } from "@/utils/parsePageParams";
import { validateId } from "@/utils/validateString";

/**
 * 收藏数据结构
 */
interface FavoriteData {
  user_id: string;
  favorite_type: FavoriteType;
  paper_id?: string;
  scholar_id?: string;
  patent_id?: string;
}

/**
 * Prisma 错误类型
 */
interface PrismaError extends Error {
  code?: string;
}

/**
 * 收藏项详情基础结构
 */
interface FavoriteItemBase {
  id: string;
  favorite_type: string;
  create_time: Date;
  paper?: {
    id: string;
    aminer_id: string | null;
    title: string | null;
    title_zh: string | null;
    year: number | null;
    authors: unknown;
    venue: unknown;
  };
  scholar?: {
    id: string;
    aminer_id: string | null;
    name: string | null;
    name_zh: string | null;
    orgs: unknown;
    position: string | null;
  };
  patent?: {
    id: string;
    aminer_id: string | null;
    title: string | null;
    year: number | null;
  };
}

/**
 * POST - 添加收藏
 */
const handlePost = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { type, item_id } = req.body;

  // 验证参数
  if (!type || !["paper", "scholar", "patent"].includes(type)) {
    return sendWarnningResponse(res, "收藏类型无效");
  }

  const itemIdResult = validateId(item_id, "项目 ID");
  if (!itemIdResult.valid) {
    return sendWarnningResponse(res, itemIdResult.error || "项目 ID 校验失败");
  }

  // item_id 直接使用数据库 UUID（支持多数据源）
  const favoriteData: FavoriteData = {
    user_id: userId,
    favorite_type: type as FavoriteType,
  };

  if (type === "paper") {
    favoriteData.paper_id = item_id;
  } else if (type === "scholar") {
    favoriteData.scholar_id = item_id;
  } else if (type === "patent") {
    favoriteData.patent_id = item_id;
  }

  // 添加收藏
  try {
    await addFavorite(favoriteData);
    return sendSuccessResponse(res, "收藏成功", {
      user_id: userId,
      favorite_type: type,
      item_id: item_id,
    });
  } catch (error: unknown) {
    // 检查是否因为重复收藏导致的错误
    const prismaError = error as PrismaError;
    if (prismaError.code === "P2002") {
      return sendWarnningResponse(res, "已收藏过该项目");
    }
    throw error;
  }
};

/**
 * DELETE - 取消收藏
 */
const handleDelete = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { type, item_id } = req.body;

  // 验证参数
  if (!type || !["paper", "scholar", "patent"].includes(type)) {
    return sendWarnningResponse(res, "收藏类型无效");
  }

  const itemIdResult = validateId(item_id, "项目 ID");
  if (!itemIdResult.valid) {
    return sendWarnningResponse(res, itemIdResult.error || "项目 ID 校验失败");
  }

  // item_id 直接使用数据库 UUID（支持多数据源）
  await removeFavoriteByItem(userId, type, item_id);

  return sendSuccessResponse(res, "已取消收藏", {
    user_id: userId,
    favorite_type: type,
    item_id: item_id,
  });
};

/**
 * GET - 获取收藏列表
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { type, page, size } = req.query;

  // 验证类型参数
  if (
    type &&
    typeof type === "string" &&
    !["paper", "scholar", "patent"].includes(type)
  ) {
    return sendWarnningResponse(res, "收藏类型无效");
  }

  // 获取收藏列表
  const result = await getUserFavorites({
    user_id: userId,
    favorite_type: type as string | undefined,
    page: parsePageNumber(page),
    size: parseLimitParam(size),
  });

  if (!result) {
    throw new Error("获取收藏列表失败");
  }

  // 根据数据库 UUID 批量查询详细信息
  const paperIds = result.items
    .filter((item) => item.paper_id)
    .map((item) => item.paper_id!);
  const scholarIds = result.items
    .filter((item) => item.scholar_id)
    .map((item) => item.scholar_id!);
  const patentIds = result.items
    .filter((item) => item.patent_id)
    .map((item) => item.patent_id!);

  const [papers, scholars, patents] = await Promise.all([
    paperIds.length > 0 ? findPapersByIds(paperIds) : Promise.resolve([]),
    scholarIds.length > 0 ? findScholarsByIds(scholarIds) : Promise.resolve([]),
    patentIds.length > 0 ? findPatentsByIds(patentIds) : Promise.resolve([]),
  ]);

  // 创建映射表（使用数据库 UUID）
  const paperMap = new Map(papers.map((p) => [p.id, p]));
  const scholarMap = new Map(scholars.map((s) => [s.id, s]));
  const patentMap = new Map(patents.map((p) => [p.id, p]));

  // 格式化返回数据
  const items = result.items
    .map((item) => {
      const baseData: FavoriteItemBase = {
        id: item.id,
        favorite_type: item.favorite_type,
        create_time: item.create_time,
      };

      if (item.paper_id) {
        const paper = paperMap.get(item.paper_id);
        if (paper) {
          baseData.paper = {
            id: paper.id,
            aminer_id: paper.source_id, // source_id 映射到 aminer_id
            title: paper.title,
            title_zh: paper.title_zh,
            year: paper.publication_year,
            authors: paper.authors,
            venue: paper.venue,
          };
        }
      } else if (item.scholar_id) {
        const scholar = scholarMap.get(item.scholar_id);
        if (scholar) {
          baseData.scholar = {
            id: scholar.id,
            aminer_id: scholar.source_id, // source_id 映射到 aminer_id
            name: scholar.name,
            name_zh: scholar.name_zh,
            orgs: scholar.orgs,
            position: scholar.position,
          };
        }
      } else if (item.patent_id) {
        const patent = patentMap.get(item.patent_id);
        if (patent) {
          baseData.patent = {
            id: patent.id,
            aminer_id: patent.source_id, // source_id 映射到 aminer_id
            title: patent.title,
            year: patent.year,
          };
        }
      }

      return baseData;
    })
    .filter((item) => item.paper || item.scholar || item.patent); // 过滤掉没有关联数据的项

  return sendSuccessResponse(res, "获取成功", {
    total: result.total,
    items,
  });
};

/**
 * 用户收藏 API
 *
 * POST /api/user/favorites - 添加收藏
 * DELETE /api/user/favorites - 取消收藏
 * GET /api/user/favorites - 获取收藏列表
 */
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method === "POST") {
    return await handlePost(req, res, userId);
  } else if (req.method === "DELETE") {
    return await handleDelete(req, res, userId);
  } else if (req.method === "GET") {
    return await handleGet(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持GET、POST和DELETE请求");
  }
};

export default withAuth(
  withErrorHandler(handler, { logPrefix: "收藏操作" })
);
