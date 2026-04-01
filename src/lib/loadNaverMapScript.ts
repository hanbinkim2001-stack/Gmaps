const SCRIPT_ATTR = "data-naver-map-sdk";

function mapsScriptSrc(clientId: string): string {
  // geocoder 서브모듈은 좌표 변환이 필요할 때만 쓰면 되지만,
  // 로드해도 부작용은 거의 없어 기본으로 포함합니다.
  return `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(
    clientId
  )}&submodules=geocoder`;
}

/** 스크립트 onload 직후에도 TransCoord 가 늦게 붙는 경우가 있어 짧게 재시도 */
function waitForTransCoord(
  maxAttempts = 40,
  delayMs = 50
): Promise<void> {
  return new Promise((resolve, reject) => {
    let n = 0;
    const tick = () => {
      if (window.naver?.maps?.TransCoord) {
        resolve();
        return;
      }
      n += 1;
      if (n >= maxAttempts) {
        reject(
          new Error(
            "좌표 변환(geocoder) 모듈을 불러오지 못했습니다. 페이지를 새로고침하세요."
          )
        );
        return;
      }
      setTimeout(tick, delayMs);
    };
    tick();
  });
}

/**
 * 네이버 지도 JS API v3 + geocoder(TransCoord) 스크립트 로드
 */
export function loadNaverMapScript(clientId: string): Promise<void> {
  if (!clientId.trim()) {
    return Promise.reject(new Error("VITE_NAVER_MAP_CLIENT_ID 가 비어 있습니다."));
  }

  if (typeof window !== "undefined" && window.naver?.maps) {
    return Promise.resolve();
  }

  // 예전에 geocoder 없이 캐시된 스크립트만 있으면 제거
  document.querySelectorAll('script[src*="openapi/v3/maps.js"]').forEach((el) => {
    const src = el.getAttribute("src") ?? "";
    if (!src.includes("submodules=geocoder")) {
      el.remove();
    }
  });

  const existing = document.querySelector<HTMLScriptElement>(
    `script[${SCRIPT_ATTR}]`
  );
  if (existing) {
    return new Promise((resolve, reject) => {
      const finish = () => {
        // 지도 기본 로드만 보장
        if (window.naver?.maps) resolve();
        else reject(new Error("네이버 지도 로드 실패"));
      };
      if (window.naver?.maps) {
        finish();
        return;
      }
      existing.addEventListener("load", finish);
      existing.addEventListener("error", () =>
        reject(new Error("네이버 지도 스크립트 로드 실패"))
      );
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.setAttribute(SCRIPT_ATTR, "v3-geocoder");
    script.src = mapsScriptSrc(clientId);
    script.onload = () => {
      if (window.naver?.maps) resolve();
      else reject(new Error("네이버 지도 로드 실패"));
    };
    script.onerror = () =>
      reject(new Error("네이버 지도 스크립트를 불러오지 못했습니다."));
    document.head.appendChild(script);
  });
}
