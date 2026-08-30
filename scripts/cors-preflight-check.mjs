const FRONTEND = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const BACKEND = process.env.PLAYWRIGHT_BACKEND_URL ?? "http://localhost:8000";

const target = `${BACKEND.replace(/\/$/, "")}/api/v1/contents/feed/batch`;

const res = await fetch(target, {
  method: "OPTIONS",
  headers: {
    Origin: FRONTEND,
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "content-type",
  },
});

console.info("CORS_PREFLIGHT", {
  frontend: FRONTEND,
  backend: BACKEND,
  status: res.status,
  allowOrigin: res.headers.get("access-control-allow-origin"),
  allowCredentials: res.headers.get("access-control-allow-credentials"),
  allowMethods: res.headers.get("access-control-allow-methods"),
});

if (res.headers.get("access-control-allow-origin") !== FRONTEND) {
  console.error("CORS origin mismatch");
  process.exit(1);
}
