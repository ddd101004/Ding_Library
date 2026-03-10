import logger from "@/helper/logger";
import prisma from "@/utils/prismaProxy";
import { Prisma } from "@prisma/client";

const select = {
  label: true,
  key: true,
  value: true,
  type: true,
};

export const findConfigByKey = async ({
  key,
  source = "aihr",
}: {
  key: string;
  source?: string;
}) => {
  try {
    const result = await prisma.commonConfig.findFirst({
      where: { key, source, disabled_status: 0 },
      select,
    });
    return result;
  } catch (error: any) {
    logger.error(`prisma 执行失败: ${error?.message}`, { error });
    return;
  }
};

export const updateConfigByKey = async (
  data: Prisma.commonConfigUpdateInput & { key: string; source: string }
) => {
  try {
    const { key, source } = data;

    const result = await prisma.commonConfig.updateMany({
      where: { key, source },
      data,
    });
    return result;
  } catch (error: any) {
    logger.error(`prisma 执行失败: ${error?.message}`, { error });
    return;
  }
};

export const findCommonConfigList = async (source = "aihr") => {
  try {
    const result = await prisma.commonConfig.findMany({
      where: { source, disabled_status: 0 },
      select,
    });
    return result;
  } catch (error: any) {
    logger.error(`prisma 执行失败: ${error?.message}`, { error });
    return;
  }
};
