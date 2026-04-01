export const handler = async (event) => {
  try {
    const upstreamPath = event.path.replace(
      /^\/\.netlify\/functions\/ncp-maps\/?/,
      ""
    );
    const upstreamUrl =
      "https://maps.apigw.ntruss.com/" +
      upstreamPath +
      (event.rawQueryString ? `?${event.rawQueryString}` : "");

    const keyId = process.env.NAVER_MAPS_API_KEY_ID || "";
    const key = process.env.NAVER_MAPS_API_KEY || "";

    const res = await fetch(upstreamUrl, {
      method: event.httpMethod || "GET",
      headers: {
        "x-ncp-apigw-api-key-id": keyId,
        "x-ncp-apigw-api-key": key,
        Accept: "application/json",
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
        error: "ncp-maps function failed",
        message: e instanceof Error ? e.message : String(e),
      }),
    };
  }
};

