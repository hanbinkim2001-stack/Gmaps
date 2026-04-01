type GeocodeAddress = {
  roadAddress?: string;
  jibunAddress?: string;
  englishAddress?: string;
  x?: string;
  y?: string;
  distance?: number;
};

type GeocodeResponse = {
  status?: string;
  addresses?: GeocodeAddress[];
  errorMessage?: string;
};

/**
 * NCP Maps Geocoding (주소 → 좌표)
 * - 프록시: /api/ncp-maps
 * - 인증: vite.config.ts에서 .env의 NAVER_MAPS_API_KEY_*를 헤더에 붙임 (브라우저에 노출 안 됨)
 */
export async function geocodeAddress(query: string): Promise<GeocodeAddress | null> {
  const q = query.trim();
  if (!q) return null;

  const url = `/api/ncp-maps/map-geocode/v2/geocode?${new URLSearchParams({
    query: q,
    count: "1",
  })}`;

  const res = await fetch(url);
  const text = await res.text();
  let data: GeocodeResponse;
  try {
    data = JSON.parse(text) as GeocodeResponse;
  } catch {
    throw new Error(`지오코딩 응답을 해석할 수 없습니다. (${res.status})`);
  }

  if (!res.ok) {
    throw new Error(
      `지오코딩 실패 (${res.status}): ${data.errorMessage ?? text.slice(0, 200)}`
    );
  }

  const first = data.addresses?.[0];
  if (!first?.x || !first?.y) return null;
  return first;
}

