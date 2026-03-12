// 学术搜索配置文件

export const ACADEMIC_SEARCH_CONFIG = {
  // 搜索配置
  SEARCH_CONFIGS: {
    '综合': {
      api: '/api/search/comprehensive',
      method: 'POST' as const,
      params: { page_size: 5 },
      pageSize: 5
    },
    '中文发现': {
      api: '/api/search/papers',
      method: 'POST' as const,
      params: { source: 'wanfang', sort_type: '中文发现', page_size: 10 },
      pageSize: 10
    },
    '外文发现': {
      api: '/api/search/papers',
      method: 'POST' as const,
      params: { source: 'wanfang_en', sort_type: '外文发现', page_size: 10 },
      pageSize: 10
    }
  },

  // 分页大小配置
  PAGE_SIZES: {
    DEFAULT: 10,
    SCHOLAR: 10,
    PATENT: 10,
    PAPER: 10,
    COMPREHENSIVE: 5
  },

  // 标签颜色配置
  TAG_COLORS: [
    'bg-[#FCD4D3]',
    'bg-[#E7FBD5]',
    'bg-[#FFF7D2]',
    'bg-[#D5F0FF]',
    'bg-[#D0DFF5]'
  ],

  // 文本截断长度配置
  TEXT_LIMITS: {
    SCHOLAR_NAME: 5,
    ORG_NAME: 16,
    PATENT_ABSTRACT: 50
  },

  // 布局配置
  LAYOUT: {
    CONTAINER_MAX_WIDTH: 1200,
    SIDEBAR_WIDTH: 204,
    CARD_HEIGHT: 270,
    SCHOLAR_CARD_WIDTH: 386,
    SCHOLAR_CARD_HEIGHT: 160,
    TAG_GAP: 20,
    SCHOLAR_GRID_GAP: 20
  },

  // 滚动配置
  SCROLL: {
    HEADER_SCROLL_THRESHOLD: 80,
    MOUSE_LEAVE_DELAY: 150,
    HEADER_HEIGHT: 80
  },

  // URL参数配置
  URL_PARAMS: {
    KEYWORD: 'q',
    TAB: 'tab',
    REDIRECT: 'redirect'
  }
};

// 搜索标签列表
export const SEARCH_TABS = ["综合", "中文发现", "外文发现"];

// 居中显示的标签列表
export const CENTER_TABS = ["综合", "中文发现", "外文发现"];

// 学者姓名检测正则
export const SCHOLAR_NAME_PATTERNS = {
  CHINESE: /^[\u4e00-\u9fa5]{2,4}$/,
  ENGLISH_FIRST_LAST: /^[A-Z][a-z]+ [A-Z][a-z]+$/,
  ENGLISH_WITH_HYPHEN: /^[A-Z][a-z]+-[A-Z][a-z]+$/
};

// 导出类型
export type SearchTabType = typeof SEARCH_TABS[number];
export type SearchConfigKey = keyof typeof ACADEMIC_SEARCH_CONFIG.SEARCH_CONFIGS;