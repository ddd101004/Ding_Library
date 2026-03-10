import logger from "@/helper/logger";
import { paginate } from "@/utils/paginate";
import prisma from "@/utils/prismaProxy";
import { Prisma } from "@prisma/client";

const querySelect = {
  id: true,
  input_content: true,
  output_content: true,
  reasoning_content: true, // 思考过程内容
  input_tokens: true,
  output_tokens: true,
  reasoning_tokens: true, // 思考过程消耗的 tokens
  total_tokens: true,
  model: true,
  type: true,
  create_time: true,
  update_time: true,
};

export const addBill = async (data: Prisma.BillCreateInput) => {
  try {
    const result = await prisma.bill.create({
      data,
    });
    return result;
  } catch (error: any) {
    logger.error(`prisma 执行失败: ${error?.message}`, { error });
    return;
  }
};

export const findBillList = async ({
  user_id,
  type,
  page = "1",
  page_size = "10",
}: {
  user_id: string;
  page?: string;
  page_size?: string;
  type?: string;
}) => {
  try {
    const { skip, take } = paginate(page, page_size);
    const where: Prisma.BillWhereInput = {
      user_id,
      deleted_status: 0,
    };
    if (type) {
      where.type = type;
    }

    // 使用 Promise.all 并行查询，减少响应时间
    const [result, total] = await Promise.all([
      prisma.bill.findMany({
        where,
        select: querySelect,
        skip,
        take,
        orderBy: [{ create_time: "desc" }],
      }),
      prisma.bill.count({ where }),
    ]);

    return { list: result, total };
  } catch (error: any) {
    logger.error(`prisma 执行失败: ${error?.message}`, { error });
    return { list: [], total: 0 };
  }
};
