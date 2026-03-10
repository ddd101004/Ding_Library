import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withAuthMonitoring } from "@/middleware/monitoring/withMonitoring";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { requestDocDelivery } from "@/service/docDelivery";
import { findPaperById } from "@/db/paper";
import { classifyPaper } from "@/service/docDelivery/classification";
import { createDocDeliveryRequest } from "@/db/docDeliveryRequest";
import logger from "@/helper/logger";
import { validateString, validateId } from "@/utils/validateString";

/**
 * 请求文献传递 API
 * POST /api/doc-delivery/request
 *
 * @requires Authentication - 需要用户登录
 * @param paper_id - 论文ID（必填，从数据库获取论文信息）
 * @param other - 其他补充信息（可选）
 * @returns 任务ID
 */
const handlePost = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { paper_id, other } = req.body;

  // 验证必填参数
  const paperIdResult = validateId(paper_id, "论文 ID");
  if (!paperIdResult.valid) {
    return sendWarnningResponse(res, paperIdResult.error || "论文 ID 校验失败");
  }

  // 校验 other（如果提供）
  if (other) {
    const otherResult = validateString(other, "其他补充信息", {
      max: 1000,
      required: false,
    });
    if (!otherResult.valid) {
      return sendWarnningResponse(res, otherResult.error || "其他补充信息校验失败");
    }
  }

  // 从数据库获取论文信息
  const paper = await findPaperById(paper_id.trim());

  if (!paper) {
    return sendWarnningResponse(res, "论文不存在");
  }

  logger.info("获取论文信息用于全文传递", {
    paperId: paper.id,
    title: paper.title,
    source: paper.source,
  });

  // 自动分类：使用 AI 大模型判断学科类别和文章类型
  const classification = await classifyPaper({
    title: paper.title,
    abstract: paper.abstract,
    keywords: paper.keywords as string[] | null,
    publication_name: paper.publication_name,
    publication_type: paper.publication_type,
    issn: paper.issn,
    isbn: paper.isbn,
    subjects: paper.subjects,
  });

  logger.info("论文自动分类结果", {
    paperId: paper.id,
    subjectCategory: classification.subject_category,
    articleType: classification.article_type,
    confidence: classification.confidence,
  });

  // 处理作者信息
  let authorStr: string | undefined;
  if (paper.authors) {
    if (Array.isArray(paper.authors)) {
      // 如果是数组，取第一个作者或拼接
      authorStr = paper.authors.slice(0, 3).join(", ");
    } else if (typeof paper.authors === "string") {
      authorStr = paper.authors;
    }
  }

  // 处理页码信息
  let pageStr: string | undefined;
  if (paper.start_page) {
    pageStr = paper.start_page;
    if (paper.page_count) {
      const endPage = parseInt(paper.start_page) + paper.page_count - 1;
      if (!isNaN(endPage)) {
        pageStr = `${paper.start_page}-${endPage}`;
      }
    }
  }

  // 准备调用参数
  const year =
    paper.publication_year?.toString() ||
    new Date(paper.publication_date || "").getFullYear().toString();
  const deliveryParams = {
    title: paper.title,
    periodical_name: paper.publication_name || undefined,
    year: year,
    page: pageStr || "1",
    period: paper.issue || "其他",
    volume: paper.volume || undefined,
    author: authorStr,
    language: classification.language, // 使用AI检测的语言
    publisher: paper.publisher || undefined,
    other: other || undefined,
    // 使用自动分类结果
    subject_type_id: classification.subject_category,
    doctype_id: classification.article_type,
  };

  // 校验必填参数（第三方接口要求）
  const missingFields: string[] = [];

  if (!deliveryParams.title) {
    missingFields.push("文章名称");
  }
  if (!deliveryParams.periodical_name) {
    missingFields.push("期刊名称");
  }
  if (!deliveryParams.year) {
    missingFields.push("出版年份");
  }
  if (!deliveryParams.page) {
    missingFields.push("文章所在页码");
  }
  if (!deliveryParams.subject_type_id) {
    missingFields.push("学科类别");
  }
  if (!deliveryParams.language) {
    missingFields.push("语言");
  }
  if (!deliveryParams.doctype_id) {
    missingFields.push("文章类型");
  }

  if (missingFields.length > 0) {
    logger.warn("文献传递缺少必填参数", {
      paperId: paper.id,
      missingFields,
    });
    return sendWarnningResponse(
      res,
      `该论文缺少以下必填信息：${missingFields.join("、")}，无法申请全文传递`
    );
  }

  // 调用文献传递服务
  const result = await requestDocDelivery(deliveryParams);

  // 检查响应状态
  if (result.code !== 200 && result.code !== 0) {
    return sendWarnningResponse(res, result.msg || "请求文献传递失败");
  }

  // 获取任务ID
  const taskId = String(result.data?.taskId || result.data);

  // 处理作者数组
  let authorsArray: string[] | undefined;
  if (paper.authors) {
    if (Array.isArray(paper.authors)) {
      authorsArray = paper.authors as string[];
    } else if (typeof paper.authors === "string") {
      authorsArray = [paper.authors];
    }
  }

  // 保存请求记录到数据库
  const savedRequest = await createDocDeliveryRequest({
    user_id: userId,
    task_id: taskId,
    paper_id: paper.id,
    title: paper.title,
    authors: authorsArray,
    publication_name: paper.publication_name || undefined,
    publication_year: paper.publication_year || undefined,
    abstract: paper.abstract || undefined,
    doi: paper.doi || undefined,
    subject_category: classification.subject_category,
    article_type: classification.article_type,
  });

  if (!savedRequest) {
    logger.warn("保存全文传递请求记录失败", { taskId, userId });
  }

  return sendSuccessResponse(res, "文献传递请求已提交", {
    id: savedRequest?.id,
    task_id: taskId,
    paper_info: {
      id: paper.id,
      title: paper.title,
      authors: authorStr,
      publication_name: paper.publication_name,
      publication_year: paper.publication_year,
    },
    classification: {
      subject_category: classification.subject_category,
      article_type: classification.article_type,
      confidence: classification.confidence,
    },
  });
};

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method === "POST") {
    return await handlePost(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持POST请求");
  }
};

export default withAuth(
  withAuthMonitoring(
    withErrorHandler(handler, { logPrefix: "请求文献传递", useLogger: true }),
    {
      monitorType: "external_api",
      apiProvider: "doc_delivery",
      operationName: "requestDocDelivery",
      extractMetadata: (req) => ({
        paperId: req.body.paper_id,
      }),
      successMetric: "doc_delivery_request_success",
      failureMetric: "doc_delivery_request_error",
    }
  )
);
