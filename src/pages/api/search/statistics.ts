import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withAuthMonitoring } from "@/middleware/monitoring/withMonitoring";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { searchPapersPro } from "@/service/aminer/paper";
import { searchScholars } from "@/service/aminer/scholar";
import { searchPatents } from "@/service/aminer/patent";
import { countPapers } from "@/db/aminer/paper";
import { validateString } from "@/utils/validateString";

/**
 * GET - 获取搜索统计数据
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { keyword } = req.query;

  // 验证必填参数
  const keywordResult = validateString(keyword, "搜索关键词", { limitKey: "keyword" });
  if (!keywordResult.valid) {
    return sendWarnningResponse(res, keywordResult.error || "搜索关键词校验失败");
  }

  const trimmedKeyword = (keyword as string).trim();

  // 并发调用三个搜索接口只获取count
  // 所有 service 层函数统一使用 page 从 1 开始，内部自动处理 AMiner API 差异
  const [paperResults, scholarResults, patentResults] =
    await Promise.allSettled([
      // 论文搜索 - 只取1条获取total
      searchPapersPro({
        title: trimmedKeyword,
        page: 1,
        size: 1,
      }),
      // 学者搜索 - 只取1条获取total
      searchScholars({
        name: trimmedKeyword,
        page: 1,
        size: 1,
      }),
      // 专利搜索 - 只取1条获取total
      searchPatents({
        query: trimmedKeyword,
        page: 1,
        size: 1,
      }),
    ]);

  // 获取论文总数
  let paperTotal = 0;
  if (paperResults.status === "fulfilled" && paperResults.value?.length > 0) {
    paperTotal = paperResults.value[0]?.total || 0;
  }

  // 获取学者总数
  let scholarTotal = 0;
  if (
    scholarResults.status === "fulfilled" &&
    scholarResults.value?.length > 0
  ) {
    scholarTotal = scholarResults.value[0]?.total || 0;
  }

  // 获取专利总数
  let patentTotal = 0;
  if (patentResults.status === "fulfilled" && patentResults.value?.length > 0) {
    patentTotal = patentResults.value[0]?.total || 0;
  }

  // 从数据库统计中英文论文数量
  // 注意: 这里统计的是数据库中已缓存的论文,不是AMiner的实时数据
  // 如果需要实时数据,需要修改实现逻辑
  let papersZh = 0;
  let papersEn = 0;

  try {
    // 使用数据库统计(基于已缓存的数据)
    papersZh = await countPapers("zh", trimmedKeyword);
    papersEn = await countPapers("en", trimmedKeyword);
  } catch (dbError) {
    console.warn("数据库统计论文数量失败,使用API总数:", dbError);
    // 如果数据库统计失败,使用简单估算(假设各占一半)
    papersZh = Math.floor(paperTotal / 2);
    papersEn = paperTotal - papersZh;
  }

  // 返回统计数据
  const statistics = {
    papers_zh: papersZh,
    papers_en: papersEn,
    papers_total: paperTotal,
    patents: patentTotal,
    scholars: scholarTotal,
  };

  return sendSuccessResponse(res, "获取成功", statistics);
};

/**
 * 搜索统计 API
 */
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method === "GET") {
    return await handleGet(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持GET请求");
  }
};

export default withAuth(
  withAuthMonitoring(
    withErrorHandler(handler, { logPrefix: "搜索统计" }),
    {
      monitorType: "external_api",
      apiProvider: "aminer",
      operationName: "getSearchStatistics",
      extractMetadata: (req) => ({
        keyword: req.query.keyword,
      }),
      successMetric: "search_statistics_success",
      failureMetric: "search_statistics_error",
    }
  )
);
