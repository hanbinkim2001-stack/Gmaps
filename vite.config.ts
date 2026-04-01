import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  // 프로젝트 루트 기준으로 .env 로드 (실행 위치와 무관하게)
  const env = loadEnv(mode, __dirname, "");

  return {
    plugins: [react()],
    server: {
      proxy: {
        // 네이버 오픈API(지역 검색) — 시크릿은 브라우저가 아니라 여기(개발 서버)에서만 붙음
        "/api/naver-local": {
          target: "https://openapi.naver.com",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/naver-local/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              const id = env.NAVER_SEARCH_CLIENT_ID ?? "";
              const secret = env.NAVER_SEARCH_CLIENT_SECRET ?? "";
              if (id) proxyReq.setHeader("X-Naver-Client-Id", id);
              if (secret) proxyReq.setHeader("X-Naver-Client-Secret", secret);
            });
          },
        },
        // NCP Maps Geocoding(주소→좌표) — API Gateway Key는 개발 서버에서만 붙음
        "/api/ncp-maps": {
          target: "https://maps.apigw.ntruss.com",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/ncp-maps/, ""),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              const keyId = env.NAVER_MAPS_API_KEY_ID ?? "";
              const key = env.NAVER_MAPS_API_KEY ?? "";
              if (keyId) proxyReq.setHeader("x-ncp-apigw-api-key-id", keyId);
              if (key) proxyReq.setHeader("x-ncp-apigw-api-key", key);
              proxyReq.setHeader("Accept", "application/json");
            });
          },
        },
      },
    },
  };
});
