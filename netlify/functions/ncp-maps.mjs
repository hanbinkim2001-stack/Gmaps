export const handler = async (event) => {
  try {
    // Netlify는 event.path를 "/.netlify/functions/..." 또는 원래 요청 경로("/api/ncp-maps/...")로 줄 수 있어 둘 다 제거
    const upstreamPath = event.path
      .replace(/^\/\.netlify\/functions\/ncp-maps\/?/, "")
      .replace(/^\/api\/ncp-maps\/?/, "");
    const normalizedPath = upstreamPath.replace(/^\/+/, "");
    const qsRaw =
      event.rawQueryString ||
      new URLSearchParams(event.queryStringParameters || {}).toString();
    const qs = qsRaw ? `?${qsRaw}` : "";
    const urlCandidates = [
      // 신규 엔드포인트 (문서 기준)
      `https://maps.apigw.ntruss.com/${normalizedPath}${qs}`,
      // 구 엔드포인트(일부 계정/상품에서 여전히 사용)
      `https://naveropenapi.apigw.ntruss.com/${normalizedPath}${qs}`,
    ];

    const keyId = process.env.NAVER_MAPS_API_KEY_ID || "";
    const key = process.env.NAVER_MAPS_API_KEY || "";

    const headers = {
      "x-ncp-apigw-api-key-id": keyId,
      "x-ncp-apigw-api-key": key,
      Accept: "application/json",
    };

    let lastRes = null;
    let lastNotFoundBody = "";
    for (const url of urlCandidates) {
      // eslint-disable-next-line no-await-in-loop
      const res = await fetch(url, {
        method: event.httpMethod || "GET",
        headers,
      });
      lastRes = res;

      // 404(Not Found Exception)는 엔드포인트 차이일 수 있어 fallback 시도
      if (res.status !== 404) break;

      // eslint-disable-next-line no-await-in-loop
      const body = await res.clone().text();
      lastNotFoundBody = body;
      if (!body.includes("Not Found Exception")) break;
      // 다음 후보로 계속
    }

    const body = await lastRes.text();
    if (
      lastRes.status === 404 &&
      (body.includes("Not Found Exception") ||
        (lastNotFoundBody && lastNotFoundBody.includes("Not Found Exception")))
    ) {
      return {
        statusCode: 502,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
        body: JSON.stringify({
          error: "NCP endpoint not found",
          tried: urlCandidates,
          hint: "지오코딩 상품/엔드포인트가 계정에 따라 다를 수 있습니다. tried URL로 직접 호출해 확인하세요.",
          upstreamBody: body,
        }),
      };
    }
    return {
      statusCode: lastRes.status,
      headers: {
        "Content-Type": lastRes.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store",
      },
      body,
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "ncp-maps function failed",
        message: e instanceof Error ? e.message : String(e),
      }),
    };
  }
};

