/**
 * PDF 高亮工具函数
 */

// 精确高亮区域类型（页面坐标）
export interface PdfHighlightArea {
  pageIndex: number; // 页码（从 0 开始）
  left: number; // 左边距百分比 (0-100)
  top: number; // 顶部距离百分比 (0-100)
  width: number; // 宽度百分比 (0-100)
  height: number; // 高度百分比 (0-100)
  color?: string; // 可选的高亮颜色
}

/**
 * 规范化高亮区域
 * - 合并同一行内水平重叠的区域
 * - 统一高度
 *
 * @param areas - 原始高亮区域数组
 * @returns 规范化后的高亮区域数组
 */
export function normalizeHighlightAreas(
  areas: PdfHighlightArea[]
): PdfHighlightArea[] {
  if (areas.length === 0) return areas;

  // 按页分组
  const pageGroups = new Map<number, PdfHighlightArea[]>();
  areas.forEach((area) => {
    const group = pageGroups.get(area.pageIndex) || [];
    group.push(area);
    pageGroups.set(area.pageIndex, group);
  });

  const result: PdfHighlightArea[] = [];

  pageGroups.forEach((pageAreas) => {
    if (pageAreas.length === 1) {
      result.push(pageAreas[0]);
      return;
    }

    // 将同一行的区域分组（top 值相近的算同一行，阈值 1%）
    const rows: PdfHighlightArea[][] = [];
    const sortedByTop = [...pageAreas].sort((a, b) => a.top - b.top);

    sortedByTop.forEach((area) => {
      // 查找是否有已存在的行可以加入
      const existingRow = rows.find(
        (row) => Math.abs(row[0].top - area.top) < 1
      );
      if (existingRow) {
        existingRow.push(area);
      } else {
        rows.push([area]);
      }
    });

    // 处理每一行：合并水平重叠的区域
    rows.forEach((row) => {
      if (row.length === 1) {
        result.push(row[0]);
        return;
      }

      // 按 left 排序
      row.sort((a, b) => a.left - b.left);

      // 合并水平重叠的区域
      const mergedRow: PdfHighlightArea[] = [];
      let current = { ...row[0] };

      for (let i = 1; i < row.length; i++) {
        const next = row[i];
        const currentRight = current.left + current.width;

        // 检查是否重叠或相邻（阈值 0.5%）
        if (next.left <= currentRight + 0.5) {
          // 合并：扩展 width
          const nextRight = next.left + next.width;
          current.width = Math.max(currentRight, nextRight) - current.left;
          // 统一高度（取较大值）
          current.height = Math.max(current.height, next.height);
          // 统一 top（取较小值）
          current.top = Math.min(current.top, next.top);
        } else {
          // 不重叠，保存当前区域，开始新区域
          mergedRow.push(current);
          current = { ...next };
        }
      }
      mergedRow.push(current);

      result.push(...mergedRow);
    });
  });

  return result;
}
