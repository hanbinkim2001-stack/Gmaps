import type { NaverPlaceBase } from "../types/place";

type Props = {
  places: NaverPlaceBase[];
  /** 목록에서 현재 선택·포커스된 장소 id (지도 마커 클릭과 동기화) */
  activePlaceId: string | null;
  onSelectPlace: (place: NaverPlaceBase) => void;
  /** 지도 준비 전에는 이동이 안 되므로 상태 표시 */
  mapReady: boolean;
};

/**
 * 네이버 지역 검색 결과 — 왼쪽 목록, 클릭 시 상위에서 지도 이동 처리
 */
export function SearchResultsSidebar({
  places,
  activePlaceId,
  onSelectPlace,
  mapReady,
}: Props) {
  if (places.length === 0) return null;

  return (
    <aside className="search-sidebar" aria-label="검색 결과 목록">
      <div className="search-sidebar__head">
        <h2 className="search-sidebar__title">검색 결과</h2>
        <span className="search-sidebar__count">
          {places.length}곳 · 지도 {mapReady ? "준비됨" : "로딩 중"}
        </span>
      </div>
      <ul className="search-sidebar__list">
        {places.map((place, index) => {
          const active = activePlaceId === place.id;
          return (
            <li key={`${place.id}-${index}`}>
              <button
                type="button"
                className={
                  active
                    ? "search-sidebar__item search-sidebar__item--active"
                    : "search-sidebar__item"
                }
                onClick={() => onSelectPlace(place)}
              >
                <span className="search-sidebar__name">{place.title}</span>
                {place.category ? (
                  <span className="search-sidebar__cat">{place.category}</span>
                ) : null}
                {place.address ? (
                  <span className="search-sidebar__addr">{place.address}</span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
