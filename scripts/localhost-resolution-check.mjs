import dns from "node:dns/promises";
import net from "node:net";

async function resolveHost(host) {
  try {
    return await dns.lookup(host, { all: true });
  } catch (e) {
    return [{ error: e instanceof Error ? e.message : String(e) }];
  }
}

function probe(host, port) {
  return new Promise(resolve => {
    const socket = net.connect({ host, port, timeout: 750 });
    socket.once("connect", () => {
      socket.destroy();
      resolve({ host, port, listening: true });
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve({ host, port, listening: false, reason: "timeout" });
    });
    socket.once("error", err => {
      socket.destroy();
      resolve({
        host,
        port,
        listening: false,
        reason: err instanceof Error ? err.message : String(err),
        code:
          err && typeof err === "object" && "code" in err
            ? err.code
            : undefined,
      });
    });
  });
}

const localhostAddrs = await resolveHost("localhost");
console.info("LOCALHOST_DNS", localhostAddrs);

for (const host of ["localhost", "127.0.0.1", "::1"]) {
  console.info("PROBE_8000", await probe(host, 8000));
  console.info("PROBE_3000", await probe(host, 3000));
}

for (const url of [
  "http://localhost:8000/health",
  "http://127.0.0.1:8000/health",
]) {
  const start = performance.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    console.info(
      "FETCH_OK",
      url,
      res.status,
      Math.round(performance.now() - start)
    );
  } catch (e) {
    console.error("FETCH_FAIL", url, e instanceof Error ? e.message : e);
  }
}
