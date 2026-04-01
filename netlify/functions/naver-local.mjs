export const handler = async (event) => {
  try {
    const upstreamPath = event.path.replace(
      /^\/\.netlify\/functions\/naver-local\/?/,
      ""
    );
    const upstreamUrl =
      "https://openapi.naver.com/" +
      upstreamPath +
      (event.rawQueryString ? `?${event.rawQueryString}` : "");

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

