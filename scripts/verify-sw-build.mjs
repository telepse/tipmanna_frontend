import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

const swPath = join(process.cwd(), "public", "sw.js");

if (!existsSync(swPath)) {
  console.error(
    "[verify-sw-build] public/sw.js is missing. Serwist did not emit the service worker.",
    "Production builds must use webpack (`next build` without --turbopack)."
  );
  process.exit(1);
}

const { size } = statSync(swPath);
if (size < 256) {
  console.error(
    `[verify-sw-build] public/sw.js exists but is too small (${size} bytes).`
  );
  process.exit(1);
}

console.log(`[verify-sw-build] public/sw.js OK (${size} bytes)`);
