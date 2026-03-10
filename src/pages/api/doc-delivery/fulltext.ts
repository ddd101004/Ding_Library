import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withAuthMonitoring } from "@/middleware/monitoring/withMonitoring";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { getFulltextUrl } from "@/service/docDelivery";
import { validateString } from "@/utils/validateString";

/**
 * 获取全文URL API
 * GET /api/doc-delivery/fulltext?lib_attach_id=xxx
 *
 * @requires Authentication - 需要用户登录
 * @param lib_attach_id - 文献附件ID（必填）
 * @returns 全文下载URL
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { lib_attach_id } = req.query;

  // 验证必填参数
  const attachIdResult = validateString(lib_attach_id, "文献附件 ID", { max: 200 });
  if (!attachIdResult.valid) {
    return sendWarnningResponse(res, attachIdResult.error || "文献附件 ID 校验失败");
  }

  // 调用文献传递服务获取全文URL
  const result = await getFulltextUrl({
    libAttachId: (lib_attach_id as string).trim(),
  });

  // 检查响应状态
  if (result.code !== 200 && result.code !== 0) {
    return sendWarnningResponse(res, result.msg || "获取全文URL失败");
  }

  return sendSuccessResponse(res, "获取成功", {
    url: result.data,
  });
};

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
    withErrorHandler(handler, { logPrefix: "获取全文URL" }),
    {
      monitorType: "external_api",
      apiProvider: "doc_delivery",
      operationName: "getFulltextUrl",
      extractMetadata: (req) => ({
        libAttachId: req.query.lib_attach_id,
      }),
      successMetric: "doc_delivery_fulltext_success",
      failureMetric: "doc_delivery_fulltext_error",
    }
  )
);
