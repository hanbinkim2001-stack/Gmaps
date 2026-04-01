import { type FormEvent, useCallback, useRef, useState } from "react";
import "./App.css";
import {
  NaverMapView,
  type SearchMarkersPayload,
} from "./components/NaverMapView";
import { PlaceDetailPanel } from "./components/PlaceDetailPanel";
import { SearchResultsSidebar } from "./components/SearchResultsSidebar";
import { samplePlaces } from "./data/samplePlaces";
import { placeExtrasById } from "./data/extras";
import { mergePlaceWithExtras } from "./lib/mergePlace";
import { fetchLocalSearch } from "./services/naverLocalSearch";
import { geocodeAddress } from "./services/ncpGeocode";
import type { LocalSearchItem } from "./types/localSearch";
import type { NaverPlaceBase, PlaceWithExtras } from "./types/place";

function App() {
  const mapRef = useRef<naver.maps.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  /** 내 위치 마커 — 한 개만 두고 좌표만 갱신 */
  const myLocationMarkerRef = useRef<naver.maps.Marker | null>(null);
  const [selected, setSelected] = useState<PlaceWithExtras | null>(null);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  /** null이면 샘플 마커, 배열이면 네이버 지역 검색 결과 */
  const [localSearchItems, setLocalSearchItems] =
    useState<LocalSearchItem[] | null>(null);
  /** 주소 지오코딩 결과처럼, 이미 좌표가 있는 장소 */
  const [overridePlaces, setOverridePlaces] = useState<NaverPlaceBase[] | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  /** 지역 검색으로 변환된 장소 목록 (왼쪽 리스트용) */
  const [searchResolvedPlaces, setSearchResolvedPlaces] = useState<
    NaverPlaceBase[]
  >([]);

  const handleMapReady = useCallback((map: naver.maps.Map, el: HTMLDivElement) => {
    mapRef.current = map;
    mapContainerRef.current = el;
    setMapReady(true);
  }, []);

  /** 왼쪽 목록·마커 클릭 시: 상세 패널 + 해당 좌표로 지도 이동 */
  const focusPlaceOnMap = useCallback((place: NaverPlaceBase) => {
    setSelected(mergePlaceWithExtras(place, placeExtrasById));
    const map = mapRef.current;
    if (!map || !window.naver?.maps) {
      // 지도 인스턴스가 아직 준비되지 않으면 상세만 열고 안내
      setSearchMessage("지도가 아직 준비되지 않아 이동할 수 없습니다. 잠시 후 다시 눌러보세요.");
      return;
    }
    try {
      // 클릭이 실제로 동작하는지 사용자에게 보이게 표시
      setSearchMessage(
        `이동 중: ${place.title} (${place.lat.toFixed(5)}, ${place.lng.toFixed(5)})`
      );
      const anyMap = map as naver.maps.Map;
      const target = new naver.maps.LatLng(place.lat, place.lng);

      // 패널이 열리기 전/후 타이밍 차이를 없애기 위해, 다음 프레임에서 "중심 리셋 + 오프셋"을 적용
      requestAnimationFrame(() => {
        try {
          anyMap.setCenter(target);
          anyMap.setZoom(16);

          // 요구사항: 누르는 순간 항상 "약간 왼쪽"에 오게 고정 오프셋
          // (패널 너비 계산이 0으로 나오는 브라우저/타이밍에서도 확실히 적용됨)
          const fixedDx = 220;
          anyMap.panBy(new naver.maps.Point(fixedDx, 0));
        } catch {
          // ignore
        }
      });

      // 이동이 실제로 반영됐는지 확인용(다음 프레임에 중심 재확인)
      requestAnimationFrame(() => {
        try {
          const c = map.getCenter();
          setSearchMessage(
            `이동 완료: ${c.lat().toFixed(5)}, ${c.lng().toFixed(5)}`
          );
        } catch {
          // ignore
        }
      });
    } catch (e) {
      console.error(e);
      setSearchMessage("지도 이동 중 오류가 발생했습니다. 콘솔 로그를 확인해 주세요.");
    }
  }, []);

  const handlePlaceClick = useCallback(
    (place: NaverPlaceBase) => {
      focusPlaceOnMap(place);
    },
    [focusPlaceOnMap]
  );

  const handleMapClick = useCallback((lat: number, lng: number) => {
    // 사용자가 지도에서 다른 곳을 누르면, 그 지점을 "진짜 중앙"으로
    const map = mapRef.current;
    if (!map || !window.naver?.maps) return;
    try {
      // 장소 선택 상태를 해제해서(패널 닫힘) 지도 가림 없이 보기
      setSelected(null);
      map.setCenter(new naver.maps.LatLng(lat, lng));
      // 패널 가림을 위한 오프셋/선택 강조는 장소 선택일 때만 적용
    } catch {
      // ignore
    }
  }, []);

  const handleSearchMarkersUpdated = useCallback(
    ({ places, sourceCount }: SearchMarkersPayload) => {
      if (sourceCount > 0 && places.length === 0) {
        setSearchMessage(
          "검색은 됐지만 지도 좌표 변환에 실패했습니다. 페이지를 새로고침한 뒤 다시 검색해 보세요."
        );
        setSelected(null);
        setSearchResolvedPlaces([]);
        return;
      }
      setSearchResolvedPlaces(places);
      if (places.length > 0) {
        setSearchMessage(
          "검색 완료 · 왼쪽 목록을 누르면 해당 위치로 이동합니다."
        );
        focusPlaceOnMap(places[0]);
      }
    },
    [focusPlaceOnMap]
  );

  const handleSearchSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      setSearchMessage("검색어를 입력하세요.");
      return;
    }
    setSearchMessage(null);
    try {
      // 1) 장소/상점 검색 (네이버 개발자센터 Search API)
      const items = await fetchLocalSearch(q);
      if (items.length > 0) {
        setOverridePlaces(null);
        setLocalSearchItems(items);
        setSearchMessage("지도에 반영 중…");
        return;
      }

      // 2) 결과가 없으면 주소 지오코딩 (NCP Maps)
      const geocoded = await geocodeAddress(q);
      if (!geocoded) {
        setSearchMessage("검색 결과가 없습니다.");
        return;
      }

      const lng = Number(geocoded.x);
      const lat = Number(geocoded.y);
      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        setSearchMessage("지오코딩 결과 좌표가 올바르지 않습니다.");
        return;
      }

      const place: NaverPlaceBase = {
        id: `ncp-geocode-${geocoded.x}-${geocoded.y}`,
        title: q,
        lat,
        lng,
        address:
          geocoded.roadAddress || geocoded.jibunAddress || geocoded.englishAddress,
      };

      setLocalSearchItems(null);
      setOverridePlaces([place]);
      setSearchMessage("주소 검색 결과 1곳");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "검색 중 오류가 났습니다.";
      setSearchMessage(msg);
    }
  };

  const handleResetSearch = () => {
    setLocalSearchItems(null);
    setOverridePlaces(null);
    setSearchResolvedPlaces([]);
    setSearchMessage(null);
    setSearchQuery("");
    setSelected(null);
  };

  const handleMyLocation = () => {
    setGeoMessage(null);
    if (!mapRef.current) {
      setGeoMessage("지도가 아직 준비되지 않았습니다.");
      return;
    }
    if (!navigator.geolocation) {
      setGeoMessage("이 브라우저는 위치 정보를 지원하지 않습니다.");
      return;
    }
    // file:// 로 열면 위치 API가 막히는 경우가 많음 → 반드시 localhost 등으로 접속
    if (typeof window !== "undefined" && !window.isSecureContext) {
      setGeoMessage(
        "위치는 https 또는 http://localhost 로 접속할 때만 사용할 수 있습니다. 주소창의 주소를 확인하세요."
      );
      return;
    }

    const applyPosition = (pos: GeolocationPosition) => {
      if (!window.naver?.maps || !mapRef.current) {
        setGeoMessage("지도가 아직 준비되지 않았습니다.");
        return;
      }
      const { latitude, longitude } = pos.coords;
      const ll = new naver.maps.LatLng(latitude, longitude);
      const map = mapRef.current;
      map.setCenter(ll);
      map.setZoom(16);

      if (myLocationMarkerRef.current) {
        myLocationMarkerRef.current.setPosition(ll);
      } else {
        myLocationMarkerRef.current = new naver.maps.Marker({
          position: ll,
          map,
          title: "현재 위치",
          zIndex: 200,
          icon: {
            content:
              '<div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.35);"></div>',
            anchor: new naver.maps.Point(9, 9),
          },
        });
      }

      setGeoMessage(null);
    };

    const onGeoError = (err: GeolocationPositionError) => {
      let hint =
        "브라우저 주소창 왼쪽 자물쇠 아이콘 → 사이트 설정에서「위치」를 허용해 보세요.";
      if (err.code === err.PERMISSION_DENIED) {
        hint =
          "위치 권한이 거부되었습니다. 주소창 왼쪽 자물쇠 → 위치「허용」, 또는 시스템 설정 > 개인정보 보호 > 위치 서비스에서 이 브라우저를 켜 주세요.";
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        hint =
          "기기에서 위치를 확인하지 못했습니다. Wi-Fi에 연결되어 있는지 확인하거나 잠시 후 다시 시도해 보세요.";
      } else if (err.code === err.TIMEOUT) {
        hint = "시간이 초과되었습니다. 네트워크 상태를 확인한 뒤 다시 눌러 보세요.";
      }
      setGeoMessage(`${hint} (오류 코드: ${err.code})`);
    };

    // 맥/데스크톱은 고정밀 GPS가 없어 enableHighAccuracy: true 만 쓰면 실패하는 경우가 많음 → 먼저 일반 정확도
    navigator.geolocation.getCurrentPosition(
      applyPosition,
      (firstErr) => {
        if (firstErr.code === firstErr.TIMEOUT) {
          navigator.geolocation.getCurrentPosition(
            applyPosition,
            onGeoError,
            {
              enableHighAccuracy: true,
              timeout: 20_000,
              maximumAge: 0,
            }
          );
          return;
        }
        onGeoError(firstErr);
      },
      {
        enableHighAccuracy: false,
        timeout: 15_000,
        maximumAge: 120_000,
      }
    );
  };

  return (
    <div className="app">
      <header className="app__bar">
        <h1 className="app__title">Gmaps</h1>
        <form className="app__search" onSubmit={handleSearchSubmit}>
          <input
            type="search"
            className="app__search-input"
            placeholder="예: 강남역 카페, 을지로 맛집"
            value={searchQuery}
            onChange={(ev) => setSearchQuery(ev.target.value)}
            aria-label="장소 검색"
          />
          <button type="submit" className="btn">
            검색
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={handleResetSearch}
          >
            초기화
          </button>
          <button type="button" className="btn" onClick={handleMyLocation}>
            내 위치
          </button>
        </form>
      </header>
      {searchMessage ? (
        <p className="app__toast app__toast--info" role="status">
          {searchMessage}
        </p>
      ) : null}
      {geoMessage ? (
        <p className="app__toast" role="status">
          {geoMessage}
        </p>
      ) : null}

      <main className="app__main">
        <SearchResultsSidebar
          places={searchResolvedPlaces}
          activePlaceId={selected?.base.id ?? null}
          onSelectPlace={focusPlaceOnMap}
          mapReady={mapReady}
        />
        <div className="app__map-shell">
          <NaverMapView
            defaultPlaces={samplePlaces}
            overridePlaces={overridePlaces}
            localSearchItems={localSearchItems}
            activePlaceId={selected?.base.id ?? null}
            onMapReady={handleMapReady}
            onPlaceClick={handlePlaceClick}
            onMapClick={handleMapClick}
            onSearchMarkersUpdated={handleSearchMarkersUpdated}
          />
          <PlaceDetailPanel
            place={selected}
            onClose={() => setSelected(null)}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
