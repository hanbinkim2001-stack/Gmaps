import type { PlaceExtraInfo } from "../types/place";

/**
 * 네이버 place id(또는 우리 마커 id) → 추가 정보
 * 나중에 필드를 마음대로 추가하면 UI에 자동 반영되도록 PlaceDetailPanel에서 순회합니다.
 */
export const placeExtrasById: Record<string, PlaceExtraInfo> = {
  "demo-1": {
    badge: "추천",
    note: "추가 정보 예시 — extras.ts만 수정해도 됩니다.",
  },
  "demo-2": {
    tip: "점심 피크는 12~1시",
  },
};
