/**
 * 네이버 지도 JS API v3 최소 타입 (공식 전체 타입 대신 필요한 것만)
 */
declare namespace naver {
  namespace maps {
    class Size {
      constructor(width: number, height: number);
    }
    class Point {
      constructor(x: number, y: number);
    }
    /** geocoder 서브모듈 로드 시 존재 */
    namespace TransCoord {
      function fromTM128ToLatLng(tm128: Point): LatLng;
    }
    class Map {
      constructor(mapDiv: string | HTMLElement, mapOptions: MapOptions);
      setCenter(latlng: LatLng): void;
      getCenter(): LatLng;
      setZoom(zoom: number): void;
      /** 부드러운 이동 (일부 환경에서 setCenter보다 확실) */
      panTo(latlng: LatLng): void;
      /** 픽셀 기준으로 화면을 이동 (패널 가림 회피용) */
      panBy(point: Point): void;
      /** 컨테이너 크기 변경 시 자동 리사이즈 */
      autoResize(): void;
      /** 명시적 리사이즈(일부 환경에서 더 확실) */
      setSize(size: Size): void;
    }
    class Marker {
      constructor(options: MarkerOptions);
      setMap(map: Map | null): void;
      setPosition(position: LatLng): void;
      setIcon(icon: { content: string; anchor: Point }): void;
      setZIndex(zIndex: number): void;
    }
    class LatLng {
      constructor(lat: number, lng: number);
      lat(): number;
      lng(): number;
    }
    interface MapOptions {
      center: LatLng;
      zoom: number;
    }
    interface MarkerOptions {
      position: LatLng;
      map: Map;
      title?: string;
      zIndex?: number;
      icon?: {
        content: string;
        anchor: Point;
      };
    }
    type MapEventListener = (e: unknown) => void;
    namespace Event {
      function addListener(
        target: Map | Marker,
        event: string,
        listener: MapEventListener
      ): void;
      function clearListeners(target: Map | Marker): void;
    }
  }
}

interface Window {
  naver?: typeof naver;
}
