export const handler = async (event) => {
  try {
    // event.path가 "/.netlify/functions/..." 또는 원래 요청 경로("/api/naver-local/...")로 올 수 있음
    const upstreamPath = event.path
      .replace(/^\/\.netlify\/functions\/naver-local\/?/, "")
      .replace(/^\/api\/naver-local\/?/, "");
    const qs =
      event.rawQueryString ||
      new URLSearchParams(event.queryStringParameters || {}).toString();
    const upstreamUrl =
      "https://openapi.naver.com/" + upstreamPath + (qs ? `?${qs}` : "");

    const clientId = process.env.NAVER_SEARCH_CLIENT_ID || "";
    const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET || "";

    const res = await fetch(upstreamUrl, {
      method: event.httpMethod || "GET",
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
    });

    const body = await res.text();
    return {
      statusCode: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store",
      },
      body,
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "naver-local function failed",
        message: e instanceof Error ? e.message : String(e),
      }),
    };
  }
};

