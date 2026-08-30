const base = process.argv[2] ?? "https://tipmanna-fj3ffgvfq-test01.vercel.app";
const html = await fetch(base).then(r => r.text());
const urls = [...html.matchAll(/https?:\/\/[^\s"'<>]+/g)].map(m => m[0]);
const hits = [...new Set(urls)].filter(
  u => u.includes("render") || u.includes("/api/v1") || u.includes("tipmanna")
);
console.log(
  JSON.stringify({ base: new URL(base).host, hits: hits.slice(0, 20) }, null, 2)
);
