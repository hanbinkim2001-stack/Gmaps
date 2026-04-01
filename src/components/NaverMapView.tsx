import { useEffect, useRef, useState } from "react";
import { localItemToPlace } from "../lib/naverLocalItem";
import { loadNaverMapScript } from "../lib/loadNaverMapScript";
import type { LocalSearchItem } from "../types/localSearch";
import type { NaverPlaceBase } from "../types/place";

export type SearchMarkersPayload = {
  places: NaverPlaceBase[];
  /** API에서 받은 원본 개수 (좌표 변환 실패 진단용) */
  sourceCount: number;
};

type Props = {
  onMapReady?: (map: naver.maps.Map, mapContainer: HTMLDivElement) => void;
  onPlaceClick: (place: NaverPlaceBase) => void;
  /** 지도 빈 곳 클릭 시 (클릭 지점을 화면 중앙으로) */
  onMapClick?: (lat: number, lng: number) => void;
  /** 검색 전·초기화 시 표시할 마커 */
  defaultPlaces: NaverPlaceBase[];
  /** 주소 지오코딩 등으로 이미 좌표가 있는 경우: 이 마커를 최우선으로 표시 */
  overridePlaces?: NaverPlaceBase[] | null;
  /** 선택된 장소 id (선택 마커 강조/나머지 반투명) */
  activePlaceId?: string | null;
  /**
   * null: defaultPlaces 사용
   * 배열: 네이버 지역 검색 결과로 마커 교체
   */
  localSearchItems: LocalSearchItem[] | null;
  /** 지역 검색 모드에서 마커를 그린 직후 (첫 곳 상세 자동 표시 등) */
  onSearchMarkersUpdated?: (payload: SearchMarkersPayload) => void;
};

/**
 * 네이버 Dynamic Map + 마커 (데모 또는 지역 검색 결과)
 */
export function NaverMapView({
  onMapReady,
  onPlaceClick,
  onMapClick,
  defaultPlaces,
  overridePlaces = null,
  activePlaceId = null,
  localSearchItems,
  onSearchMarkersUpdated,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<naver.maps.Map | null>(null);
  const markersRef = useRef<naver.maps.Marker[]>([]);
  const markerPlacesRef = useRef<NaverPlaceBase[]>([]);
  const homeMarkerRef = useRef<naver.maps.Marker | null>(null);
  const placeClickRef = useRef(onPlaceClick);
  const mapReadyRef = useRef(onMapReady);
  const searchUpdatedRef = useRef(onSearchMarkersUpdated);

  placeClickRef.current = onPlaceClick;
  mapReadyRef.current = onMapReady;
  searchUpdatedRef.current = onSearchMarkersUpdated;

  const [loadError, setLoadError] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<naver.maps.Map | null>(null);

  useEffect(() => {
    const clientId = (import.meta.env.VITE_NAVER_MAP_CLIENT_ID ?? "").trim();
    let cancelled = false;
    setLoadError(null);

    loadNaverMapScript(clientId)
      .then(() => {
        if (cancelled || !containerRef.current || !window.naver?.maps) return;

        // StrictMode/리렌더로 동일 div에 지도 인스턴스가 겹치면
        // "중심은 바뀌는데 화면이 안 움직이는" 것처럼 보일 수 있어 초기화
        containerRef.current.innerHTML = "";

        // 기본 시작 위치: 가천대 글로벌캠퍼스 (300m 보기)
        const GACHON_GLOBAL = { lat: 37.4509, lng: 127.1286 };

        const map = new naver.maps.Map(containerRef.current, {
          center: new naver.maps.LatLng(GACHON_GLOBAL.lat, GACHON_GLOBAL.lng),
          zoom: 16,
        });
        mapInstanceRef.current = map;
        setMapInstance(map);
        mapReadyRef.current?.(map, containerRef.current);

        // 지도 빈 곳 클릭: 해당 지점을 화면 중앙으로 이동
        naver.maps.Event.addListener(map, "click", (e: unknown) => {
          // docs에서 click 이벤트는 coord 또는 latlng로 들어오는 케이스가 있어 둘 다 처리
          const ev = e as { coord?: naver.maps.LatLng; latlng?: naver.maps.LatLng };
          const ll = ev.coord ?? ev.latlng;
          if (!ll) return;
          try {
            map.setCenter(ll);
            onMapClick?.(ll.lat(), ll.lng());
          } catch {
            // ignore
          }
        });

        // 캠퍼스 기준점 마커 + 300m 원
        const center = new naver.maps.LatLng(GACHON_GLOBAL.lat, GACHON_GLOBAL.lng);
        homeMarkerRef.current = new naver.maps.Marker({
          position: center,
          map,
          title: "가천대 글로벌캠퍼스",
          zIndex: 150,
        });
      })
      .catch((err: unknown) => {
        console.error(err);
        const msg =
          err instanceof Error ? err.message : "지도를 불러오지 못했습니다.";
        setLoadError(msg);
      });

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => {
        naver.maps.Event.clearListeners(marker);
        marker.setMap(null);
      });
      markersRef.current = [];
      homeMarkerRef.current?.setMap(null);
      homeMarkerRef.current = null;
      if (mapInstanceRef.current) {
        naver.maps.Event.clearListeners(mapInstanceRef.current);
        mapInstanceRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      setMapInstance(null);
    };
  }, []);

  // 레이아웃(사이드바 등)로 지도 컨테이너 크기가 바뀌면, 지도도 리사이즈 트리거가 필요할 수 있음
  useEffect(() => {
    if (!mapInstance || !containerRef.current) return;

    const anyMap = mapInstance as unknown as { autoResize?: () => void };
    const trigger = () => {
      try {
        anyMap.autoResize?.();
      } catch {
        // ignore
      }
    };

    trigger();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => trigger());
      ro.observe(containerRef.current);
    }

    window.addEventListener("resize", trigger);
    return () => {
      window.removeEventListener("resize", trigger);
      ro?.disconnect();
    };
  }, [mapInstance]);

  useEffect(() => {
    if (!mapInstance || !window.naver?.maps) return;

    markersRef.current.forEach((marker) => {
      naver.maps.Event.clearListeners(marker);
      marker.setMap(null);
    });
    markersRef.current = [];
    markerPlacesRef.current = [];

    const hasOverride = overridePlaces !== null;
    const fromLocalSearch = !hasOverride && localSearchItems !== null;
    const places: NaverPlaceBase[] = hasOverride
      ? (overridePlaces ?? [])
      : fromLocalSearch
        ? (localSearchItems ?? [])
            .map((item, i) => localItemToPlace(item, i))
            .filter((p): p is NaverPlaceBase => p !== null)
        : defaultPlaces;

    places.forEach((place) => {
      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(place.lat, place.lng),
        map: mapInstance,
        title: place.title,
      });
      naver.maps.Event.addListener(marker, "click", () => {
        placeClickRef.current(place);
      });
      markersRef.current.push(marker);
      markerPlacesRef.current.push(place);
    });

    if ((hasOverride || fromLocalSearch) && places.length > 0) {
      mapInstance.setCenter(
        new naver.maps.LatLng(places[0].lat, places[0].lng)
      );
      mapInstance.setZoom(15);
    }

    if (hasOverride) {
      searchUpdatedRef.current?.({
        places,
        sourceCount: places.length,
      });
    } else if (fromLocalSearch && localSearchItems) {
      searchUpdatedRef.current?.({
        places,
        sourceCount: localSearchItems.length,
      });
    }
  }, [mapInstance, localSearchItems, defaultPlaces, overridePlaces]);

  // 선택된 장소에 맞춰 마커 스타일 업데이트 (선택 마커는 크게/진하게, 나머지는 반투명)
  useEffect(() => {
    if (!window.naver?.maps) return;
    const places = markerPlacesRef.current;
    const markers = markersRef.current;
    if (places.length !== markers.length) return;

    for (let i = 0; i < markers.length; i += 1) {
      const place = places[i];
      const marker = markers[i];
      const isActive = !!activePlaceId && place.id === activePlaceId;

      const size = isActive ? 26 : 18;
      const border = isActive ? 4 : 3;
      const opacity = isActive || !activePlaceId ? 1 : 0.65;
      const zIndex = isActive ? 300 : 120;

      try {
        marker.setZIndex(zIndex);
        marker.setIcon({
          content: `<div style=\"width:${size}px;height:${size}px;border-radius:50%;background:#03c75a;border:${border}px solid #fff;opacity:${opacity};box-shadow:0 1px 6px rgba(0,0,0,.35);\"></div>`,
          anchor: new naver.maps.Point(size / 2, size / 2),
        });
      } catch {
        // 아이콘 커스텀을 지원하지 않는 환경이면 기본 마커로 유지
      }
    }
  }, [activePlaceId]);

  const rawKey = import.meta.env.VITE_NAVER_MAP_CLIENT_ID ?? "";
  const missingKey = !String(rawKey).trim();

  return (
    <div className="map-wrap">
      <div ref={containerRef} className="map-canvas" />
      {missingKey ? (
        <div className="map-overlay">
          <p>
            프로젝트 루트에 <strong>파일</strong> <code>.env</code>를 만들고 한 줄로
            적으세요. (터미널에 치는 것이 아닙니다)
          </p>
          <pre className="map-overlay__code">
            VITE_NAVER_MAP_CLIENT_ID=발급받은_Client_ID
          </pre>
          <p className="map-overlay__hint">
            Client ID는 이메일이 아니라, 콘솔에서 복사한 짧은 문자열입니다.
          </p>
        </div>
      ) : null}
      {loadError ? (
        <div className="map-overlay map-overlay--error">
          <p>
            <strong>지도 로드 실패</strong>
          </p>
          <p>{loadError}</p>
          <p className="map-overlay__hint">
            NCP 콘솔에서 이 앱의 <strong>웹 사이트 URL</strong>에{" "}
            <code>http://localhost:5173</code> (또는 터미널에 나온 포트)를
            등록했는지 확인하세요. 수정 후 <code>npm run dev</code>를 다시
            실행하세요.
          </p>
        </div>
      ) : null}
    </div>
  );
}
