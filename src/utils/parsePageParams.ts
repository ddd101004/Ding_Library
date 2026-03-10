/**
 * 解析并验证分页参数
 * @param value - 分页参数值（字符串或undefined）
 * @param defaultValue - 默认值
 * @param min - 最小值（默认为1）
 * @param max - 最大值（可选）
 * @returns 解析后的有效数值
 */
export const parsePageParam = (
  value: string | string[] | undefined,
  defaultValue: number = 1,
  min: number = 1,
  max?: number
): number => {
  // 处理数组情况（取第一个值）
  const stringValue = Array.isArray(value) ? value[0] : value;

  // 解析为数字
  const parsed = parseInt(stringValue || "", 10);

  // 验证：NaN、小于最小值、大于最大值时返回默认值
  if (isNaN(parsed) || parsed < min || (max !== undefined && parsed > max)) {
    return defaultValue;
  }

  return parsed;
};

/**
 * 解析并验证 limit 参数
 * @param value - limit 参数值
 * @param defaultValue - 默认值（默认为20）
 * @param maxLimit - 最大限制（默认为100）
 * @returns 解析后的有效数值
 */
export const parseLimitParam = (
  value: string | string[] | undefined,
  defaultValue: number = 20,
  maxLimit: number = 100
): number => {
  return parsePageParam(value, defaultValue, 1, maxLimit);
};

/**
 * 解析并验证页码参数
 * @param value - page 参数值
 * @param defaultValue - 默认值（默认为1）
 * @returns 解析后的有效页码
 */
export const parsePageNumber = (
  value: string | string[] | undefined,
  defaultValue: number = 1
): number => {
  return parsePageParam(value, defaultValue, 1);
};
