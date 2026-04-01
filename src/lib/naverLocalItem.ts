import type { LocalSearchItem } from "../types/localSearch";
import type { NaverPlaceBase } from "../types/place";

/** 네이버 검색 결과 제목에 붙는 HTML 제거 */
export function stripHtmlTitle(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

/**
 * 지역 검색 item(mapx/mapy) → 지도용 좌표
 *
 * 네이버 지역 검색 API(local.json)의 mapx/mapy는 보통 정수로 내려오며,
 * 실측으로는 WGS84 경/위도에 1e7을 곱한 값(예: 1270263860 → 127.0263860)인 경우가 많습니다.
 * (과거 글들에 TM128이라고도 되어 있어, 값 크기에 따라 보정 로직을 둡니다.)
 */
export function localItemToPlace(
  item: LocalSearchItem,
  index: number
): NaverPlaceBase | null {
  const x = Number(item.mapx);
  const y = Number(item.mapy);
  if (Number.isNaN(x) || Number.isNaN(y)) return null;

  // WGS84 * 1e7 형태면 그대로 복원
  let lng = x / 1e7;
  let lat = y / 1e7;

  const looksLikeWgs84 = (la: number, lo: number) =>
    la >= -90 && la <= 90 && lo >= -180 && lo <= 180;

  // 복원 결과가 말이 안 되면, TM128 → LatLng 변환(geocoder 서브모듈)로 fallback
  if (!looksLikeWgs84(lat, lng)) {
    if (!window.naver?.maps?.TransCoord) return null;
    const latlng = naver.maps.TransCoord.fromTM128ToLatLng(
      new naver.maps.Point(x, y)
    );
    lat = latlng.lat();
    lng = latlng.lng();
  }

  const id =
    item.link?.trim() ||
    `naver-local-${String(item.mapx)}-${String(item.mapy)}-${index}`;

  return {
    id,
    title: stripHtmlTitle(item.title),
    lat,
    lng,
    naverLink: item.link?.trim() || undefined,
    address: item.roadAddress || item.address || undefined,
    phone: item.telephone?.trim() || undefined,
    category: item.category || undefined,
    description: item.description || undefined,
  };
}
