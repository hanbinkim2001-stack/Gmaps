import type { NaverPlaceBase, PlaceExtraInfo, PlaceWithExtras } from "../types/place";

/**
 * 네이버 기본 정보 + 우리 extras 레이어를 하나로 합침
 */
export function mergePlaceWithExtras(
  base: NaverPlaceBase,
  extrasMap: Record<string, PlaceExtraInfo>
): PlaceWithExtras {
  const extra = extrasMap[base.id] ?? null;
  return { base, extra };
}
