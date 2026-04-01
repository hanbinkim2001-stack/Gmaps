/**
 * 지도/검색에서 오는 네이버 쪽 기본 정보 (추후 Places API 응답에 맞게 확장)
 */
export interface NaverPlaceBase {
  /** extras 매칭용 고유 ID — 네이버 placeId 또는 우리가 쓰는 키 */
  id: string;
  title: string;
  lat: number;
  lng: number;
  /** 네이버 상세 페이지 링크(있으면 외부로 열기) */
  naverLink?: string;
  /** 주소 등 API에서 오면 채움 */
  address?: string;
  phone?: string;
  /** 네이버 지역 검색 등 */
  category?: string;
  description?: string;
}

/**
 * 우리 서비스만의 추가 정보 (필드는 자유롭게 늘리면 됨)
 */
export type PlaceExtraInfo = Record<
  string,
  string | number | boolean | string[] | undefined
>;

/**
 * 화면에 넘길 때 쓰는 합쳐진 모델
 */
export interface PlaceWithExtras {
  base: NaverPlaceBase;
  /** 해당 id에 extras가 없으면 null */
  extra: PlaceExtraInfo | null;
}
