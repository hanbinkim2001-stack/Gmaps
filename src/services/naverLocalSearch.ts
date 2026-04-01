import type { LocalSearchItem, LocalSearchResponse } from "../types/localSearch";

type NaverErrorBody = {
  errorMessage?: string;
  errorCode?: string;
};

/**
 * 네이버 지역 검색 (openapi.naver.com)
 * 개발: Vite 프록시 `/api/naver-local` + .env 의 NAVER_SEARCH_* (시크릿은 서버에서만)
 *
 * 주의: NCP Maps용 Client ID와 다른「네이버 개발자센터」앱에서 발급한 ID/Secret을 써야 합니다.
 */
export async function fetchLocalSearch(query: string): Promise<LocalSearchItem[]> {
  const q = query.trim();
  if (!q) return [];

  const url = `/api/naver-local/v1/search/local.json?${new URLSearchParams({
    query: q,
    display: "5",
    sort: "random",
  })}`;

  const res = await fetch(url);
  const text = await res.text();
  let data: LocalSearchResponse | NaverErrorBody;
  try {
    data = JSON.parse(text) as LocalSearchResponse | NaverErrorBody;
  } catch {
    throw new Error(
      `지역 검색 응답을 해석할 수 없습니다. (${res.status})`
    );
  }

  if (!res.ok) {
    const naverErr = data as NaverErrorBody;
    const detail =
      naverErr.errorMessage ||
      naverErr.errorCode ||
      text.slice(0, 200);
    const hint401 =
      res.status === 401
        ? " → 네이버「개발자센터」앱의 Client ID/Secret인지 확인하세요. (NCP 지도 키만으로는 검색이 안 될 수 있습니다.)"
        : "";
    throw new Error(`지역 검색 실패 (${res.status}): ${detail}${hint401}`);
  }

  return (data as LocalSearchResponse).items ?? [];
}
