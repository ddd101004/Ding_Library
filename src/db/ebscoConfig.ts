/**
 * EBSCO配置数据库操作层
 *
 * 提供EbscoConfig模型的CRUD操作
 * 用于管理EBSCO相关的配置参数
 */

import logger from "@/helper/logger";
import prisma from "@/utils/prismaProxy";
import { Prisma } from "@prisma/client";

// ==================== 创建操作 ====================

/**
 * 创建配置项
 */
export async function createConfig(data: Prisma.EbscoConfigCreateInput) {
  try {
    const config = await prisma.ebscoConfig.create({
      data,
    });
    logger.info("创建EBSCO配置成功", {
      key: config.config_key,
      group: config.config_group,
    });
    return config;
  } catch (error: any) {
    logger.error("创建EBSCO配置失败", { error: error.message, data });
    return null;
  }
}

/**
 * 批量创建配置项
 */
export async function createManyConfigs(
  configs: Prisma.EbscoConfigCreateManyInput[]
) {
  try {
    const result = await prisma.ebscoConfig.createMany({
      data: configs,
      skipDuplicates: true,
    });
    logger.info("批量创建EBSCO配置成功", { count: result.count });
    return result;
  } catch (error: any) {
    logger.error("批量创建EBSCO配置失败", {
      error: error.message,
      count: configs.length,
    });
    return null;
  }
}

// ==================== 查询操作 ====================

/**
 * 根据配置键获取配置
 */
export async function getConfigByKey(configKey: string) {
  try {
    const config = await prisma.ebscoConfig.findFirst({
      where: {
        config_key: configKey,
        disabled_status: 0,
      },
    });
    return config;
  } catch (error: any) {
    logger.error("根据键获取EBSCO配置失败", {
      error: error.message,
      configKey,
    });
    return null;
  }
}

/**
 * 获取配置值
 * @param configKey 配置键
 * @param defaultValue 默认值
 */
export async function getConfigValue<T = string>(
  configKey: string,
  defaultValue?: T
): Promise<T> {
  try {
    const config = await getConfigByKey(configKey);
    if (!config) {
      return defaultValue as T;
    }

    // 根据类型转换值
    switch (config.config_type) {
      case "number":
        return Number(config.config_value) as T;
      case "boolean":
        return (config.config_value === "true") as T;
      case "json":
        return JSON.parse(config.config_value) as T;
      default:
        return config.config_value as T;
    }
  } catch (error: any) {
    logger.error("获取EBSCO配置值失败", { error: error.message, configKey });
    return defaultValue as T;
  }
}

/**
 * 根据分组获取配置列表
 */
export async function getConfigsByGroup(configGroup: string) {
  try {
    const configs = await prisma.ebscoConfig.findMany({
      where: {
        config_group: configGroup,
        disabled_status: 0,
      },
      orderBy: {
        sort_order: "asc",
      },
    });
    return configs;
  } catch (error: any) {
    logger.error("根据分组获取EBSCO配置失败", {
      error: error.message,
      configGroup,
    });
    return [];
  }
}

/**
 * 获取所有公开配置
 * 用于前端展示
 */
export async function getPublicConfigs() {
  try {
    const configs = await prisma.ebscoConfig.findMany({
      where: {
        is_public: true,
        disabled_status: 0,
      },
      orderBy: [{ config_group: "asc" }, { sort_order: "asc" }],
    });
    return configs;
  } catch (error: any) {
    logger.error("获取公开EBSCO配置失败", { error: error.message });
    return [];
  }
}

/**
 * 获取所有配置（分组）
 */
export async function getAllConfigsGrouped() {
  try {
    const configs = await prisma.ebscoConfig.findMany({
      where: {
        disabled_status: 0,
      },
      orderBy: [{ config_group: "asc" }, { sort_order: "asc" }],
    });

    // 按分组整理
    const grouped: Record<string, any[]> = {};
    configs.forEach((config) => {
      if (!grouped[config.config_group]) {
        grouped[config.config_group] = [];
      }
      grouped[config.config_group].push(config);
    });

    return grouped;
  } catch (error: any) {
    logger.error("获取分组EBSCO配置失败", { error: error.message });
    return {};
  }
}

// ==================== 更新操作 ====================

/**
 * 更新配置
 */
export async function updateConfig(
  configKey: string,
  data: Prisma.EbscoConfigUpdateInput
) {
  try {
    const config = await prisma.ebscoConfig.update({
      where: { config_key: configKey },
      data,
    });
    logger.info("更新EBSCO配置成功", { key: config.config_key });
    return config;
  } catch (error: any) {
    logger.error("更新EBSCO配置失败", { error: error.message, configKey });
    return null;
  }
}

/**
 * 设置配置值
 * 如果不存在则创建，存在则更新
 */
export async function setConfigValue(
  configKey: string,
  configValue: any,
  configType?: string,
  description?: string,
  configGroup?: string
) {
  try {
    // 根据值类型自动推断config_type
    let type = configType;
    if (!type) {
      if (typeof configValue === "number") {
        type = "number";
      } else if (typeof configValue === "boolean") {
        type = "boolean";
      } else if (typeof configValue === "object") {
        type = "json";
      } else {
        type = "string";
      }
    }

    // 转换值为字符串
    let valueStr: string;
    if (type === "json") {
      valueStr = JSON.stringify(configValue);
    } else {
      valueStr = String(configValue);
    }

    const config = await prisma.ebscoConfig.upsert({
      where: { config_key: configKey },
      create: {
        config_key: configKey,
        config_value: valueStr,
        config_type: type,
        description: description || "",
        config_group: configGroup || "general",
      },
      update: {
        config_value: valueStr,
        config_type: type,
        ...(description && { description }),
        ...(configGroup && { config_group: configGroup }),
      },
    });

    logger.info("设置EBSCO配置值成功", {
      key: config.config_key,
      type: config.config_type,
    });
    return config;
  } catch (error: any) {
    logger.error("设置EBSCO配置值失败", {
      error: error.message,
      configKey,
      configValue,
    });
    return null;
  }
}

/**
 * 批量更新配置
 */
export async function batchUpdateConfigs(
  updates: Array<{ configKey: string; configValue: any }>
) {
  try {
    const promises = updates.map((update) =>
      setConfigValue(update.configKey, update.configValue)
    );

    const results = await Promise.allSettled(promises);
    const successful = results.filter((r) => r.status === "fulfilled").length;

    logger.info("批量更新EBSCO配置", {
      total: updates.length,
      successful,
    });

    return { total: updates.length, successful };
  } catch (error: any) {
    logger.error("批量更新EBSCO配置失败", {
      error: error.message,
      count: updates.length,
    });
    return null;
  }
}

// ==================== 删除操作 ====================

/**
 * 软删除配置（禁用）
 */
export async function disableConfig(configKey: string) {
  try {
    const config = await prisma.ebscoConfig.update({
      where: { config_key: configKey },
      data: { disabled_status: 1 },
    });
    logger.info("禁用EBSCO配置成功", { key: config.config_key });
    return config;
  } catch (error: any) {
    logger.error("禁用EBSCO配置失败", { error: error.message, configKey });
    return null;
  }
}

/**
 * 启用配置
 */
export async function enableConfig(configKey: string) {
  try {
    const config = await prisma.ebscoConfig.update({
      where: { config_key: configKey },
      data: { disabled_status: 0 },
    });
    logger.info("启用EBSCO配置成功", { key: config.config_key });
    return config;
  } catch (error: any) {
    logger.error("启用EBSCO配置失败", { error: error.message, configKey });
    return null;
  }
}

/**
 * 硬删除配置
 */
export async function deleteConfig(configKey: string) {
  try {
    const config = await prisma.ebscoConfig.delete({
      where: { config_key: configKey },
    });
    logger.info("删除EBSCO配置成功", { key: config.config_key });
    return config;
  } catch (error: any) {
    logger.error("删除EBSCO配置失败", { error: error.message, configKey });
    return null;
  }
}

// ==================== 初始化默认配置 ====================

/**
 * 初始化默认配置
 * 在系统首次运行时调用
 */
export async function initDefaultConfigs() {
  try {
    const defaultConfigs: Prisma.EbscoConfigCreateManyInput[] = [
      // API配置
      {
        config_key: "ebsco.api.base_url",
        config_value: "https://eds-api.ebscohost.com",
        config_type: "string",
        description: "EBSCO API基础URL",
        config_group: "api",
        sort_order: 1,
        is_public: false,
      },

      // 认证配置
      {
        config_key: "ebsco.auth.type",
        config_value: "ip",
        config_type: "string",
        description: "认证类型: ip 或 uid",
        config_group: "auth",
        sort_order: 1,
        is_public: false,
      },
      {
        config_key: "ebsco.auth.user_id",
        config_value: "",
        config_type: "string",
        description: "EBSCO用户ID（UID认证使用）",
        config_group: "auth",
        sort_order: 2,
        is_public: false,
      },
      {
        config_key: "ebsco.auth.password",
        config_value: "",
        config_type: "string",
        description: "EBSCO密码（UID认证使用）",
        config_group: "auth",
        sort_order: 3,
        is_public: false,
      },
      {
        config_key: "ebsco.auth.profile",
        config_value: "edsapi",
        config_type: "string",
        description: "EBSCO配置文件ID",
        config_group: "auth",
        sort_order: 4,
        is_public: false,
      },

      // 同步配置
      {
        config_key: "ebsco.sync.daily_count",
        config_value: "100",
        config_type: "number",
        description: "每日同步论文数量",
        config_group: "sync",
        sort_order: 1,
        is_public: true,
      },
      {
        config_key: "ebsco.sync.cron",
        config_value: "0 2 * * *",
        config_type: "string",
        description: "同步任务Cron表达式（每天凌晨2点）",
        config_group: "sync",
        sort_order: 2,
        is_public: false,
      },
      {
        config_key: "ebsco.sync.default_query",
        config_value: "*",
        config_type: "string",
        description: "默认搜索查询",
        config_group: "sync",
        sort_order: 3,
        is_public: false,
      },

      // 下载配置
      {
        config_key: "ebsco.download.daily_count",
        config_value: "100",
        config_type: "number",
        description: "每日下载PDF数量",
        config_group: "download",
        sort_order: 1,
        is_public: true,
      },
      {
        config_key: "ebsco.download.rate_limit",
        config_value: "5",
        config_type: "number",
        description: "下载速率限制（秒/个）",
        config_group: "download",
        sort_order: 2,
        is_public: true,
      },
      {
        config_key: "ebsco.download.cron",
        config_value: "0 3 * * *",
        config_type: "string",
        description: "下载任务Cron表达式（每天凌晨3点）",
        config_group: "download",
        sort_order: 3,
        is_public: false,
      },
      {
        config_key: "ebsco.download.storage_path",
        config_value: "/uploads/papers",
        config_type: "string",
        description: "PDF存储路径",
        config_group: "download",
        sort_order: 4,
        is_public: false,
      },

      // 搜索配置
      {
        config_key: "ebsco.search.limiters",
        config_value: JSON.stringify({ FT: "y" }),
        config_type: "json",
        description: "默认限制器",
        config_group: "search",
        sort_order: 1,
        is_public: false,
      },
      {
        config_key: "ebsco.search.expanders",
        config_value: JSON.stringify(["fulltext"]),
        config_type: "json",
        description: "默认扩展器",
        config_group: "search",
        sort_order: 2,
        is_public: false,
      },
    ];

    const result = await createManyConfigs(defaultConfigs);
    logger.info("初始化默认EBSCO配置完成", { count: result?.count || 0 });
    return result;
  } catch (error: any) {
    logger.error("初始化默认EBSCO配置失败", { error: error.message });
    return null;
  }
}
