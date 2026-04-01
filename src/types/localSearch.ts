/** 네이버 지역 검색 API(local.json) item — 공식 문서 필드 기준 */
export interface LocalSearchItem {
  title: string;
  link: string;
  category: string;
  description: string;
  telephone: string;
  address: string;
  roadAddress: string;
  mapx: string;
  mapy: string;
}

export interface LocalSearchResponse {
  items?: LocalSearchItem[];
  total?: number;
}
