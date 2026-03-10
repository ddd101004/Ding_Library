export interface SearchResult {
  id: string;
  source: string;
  title: string;
  title_zh?: string;
  abstract?: string;
  authors?: Array<{
    name: string;
    name_zh?: string;
    org?: string;
    org_zh?: string;
  }>;
  venue?: {
    raw?: string;
    raw_zh?: string;
  };
  year?: number;
  n_citation?: number;
  publication_name?: string;
  publication_date?: string;
  isFavorited: boolean;
}

export interface ScholarResult {
  id: string;
  source: string;
  name: string;
  name_zh?: string;
  org?: string;
  org_zh?: string;
  orgs?: string[];
  org_zhs?: string[];
  position?: string;
  interests?: string[];
  n_citation?: number;
  isFavorited: boolean;
}

export interface PatentResult {
  id: string;
  source: string;
  title: string;
  title_zh?: string;
  abstract?: string;
  year?: number;
  app_num?: string;
  pub_num?: string;
  country?: string;
  inventors?: Array<{
    name: string;
  }>;
  isFavorited: boolean;
}

export interface ComprehensiveSearchResponse {
  keyword: string;
  tags: string[];
  papers_zh: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    items: SearchResult[];
    source: string;
  };
  papers_en: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    items: SearchResult[];
    source: string;
  };
  scholars: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    items: ScholarResult[];
    source: string;
  };
  patents: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    items: PatentResult[];
    source: string;
  };
}