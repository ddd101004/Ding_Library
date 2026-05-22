/**
 * 分页计算工具 — 计算Prisma查询的skip/take值
 *
 * 【后端】仅在db层使用
 *
 * 导出函数：
 * - paginate(page, pageSize) — 计算skip和take，pageSize上限100，page下限1
 *   返回 { skip, take }
 *
 * 引用方：
 * - db/paper.ts — 论文查询分页
 * - db/user.ts — 用户列表分页
 */
export const paginate = (page: number | string, pageSize: number | string) => {
  page = +page;
  pageSize = +pageSize;

  if (pageSize > 100) {
    pageSize = 100;
  }
  if (+page < 1) {
    page = 1;
  }
  if (+pageSize < 1) {
    pageSize = 1;
  }

  const skip = (page - 1) * pageSize;
  const take = pageSize;

  return {
    skip,
    take,
  };
};
