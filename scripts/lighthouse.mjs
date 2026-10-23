import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const lighthouse = (await import("lighthouse")).default;
const chromeLauncher = require("chrome-launcher");

const pages = [
  ["inicio", "http://127.0.0.1:4173/"],
  ["detalhe", "http://127.0.0.1:4173/nft/sage-nomad-009"],
];
const profiles = [
  ["mobile", {
    formFactor: "mobile",
    screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false },
  }],
  ["desktop", {
    formFactor: "desktop",
    screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0,
    },
  }],
];

const preview = spawn("npx", ["vite", "preview", "--host", "127.0.0.1", "--port", "4173"], {
  shell: true,
  stdio: "inherit",
});

for (let attempt = 0; attempt < 40; attempt += 1) {
  try {
    const response = await fetch("http://127.0.0.1:4173/");
    if (response.ok) break;
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (attempt === 39) throw new Error("O preview não ficou disponível em http://127.0.0.1:4173");
  }
}
await mkdir("lighthouse-reports", { recursive: true });

const summary = [];
for (const [pageName, url] of pages) {
  for (const [profileName, settings] of profiles) {
    const scores = [];
    for (let run = 1; run <= 3; run += 1) {
      const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless", "--no-sandbox"] });
      const result = await lighthouse(url, {
        port: chrome.port,
        output: ["html", "json"],
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      }, {
        extends: "lighthouse:default",
        settings: {
          ...settings,
          formFactor: profileName,
          screenEmulation: settings.screenEmulation,
        },
      });
      const categories = result.lhr.categories;
      const row = {
        page: pageName,
        profile: profileName,
        run,
        performance: Math.round(categories.performance.score * 100),
        accessibility: Math.round(categories.accessibility.score * 100),
        bestPractices: Math.round(categories["best-practices"].score * 100),
        seo: Math.round(categories.seo.score * 100),
        lcp: result.lhr.audits["largest-contentful-paint"].numericValue,
        cls: result.lhr.audits["cumulative-layout-shift"].numericValue,
        tbt: result.lhr.audits["total-blocking-time"].numericValue,
      };
      scores.push(row);
      await writeFile(`lighthouse-reports/${pageName}-${profileName}-${run}.json`, result.report[1]);
      await writeFile(`lighthouse-reports/${pageName}-${profileName}-${run}.html`, result.report[0]);
      await chrome.kill();
    }
    const median = (key) => scores.map((item) => item[key]).sort((a, b) => a - b)[1];
    summary.push({
      page: pageName,
      profile: profileName,
      performance: median("performance"),
      accessibility: median("accessibility"),
      bestPractices: median("bestPractices"),
      seo: median("seo"),
      lcp: median("lcp"),
      cls: median("cls"),
      tbt: median("tbt"),
    });
  }
}

await writeFile("lighthouse-reports/summary.json", JSON.stringify({
  generatedAt: new Date().toISOString(),
  node: process.version,
  lighthouse: require("lighthouse/package.json").version,
  chrome: "chrome-launcher headless",
  build: "vite preview do dist, cenário padrão dos mocks",
  runs: 3,
  median: "valor central de cada métrica",
  targets: { performance: 90, accessibility: 95, bestPractices: 95, seo: 90 },
  summary,
}, null, 2));
preview.kill();
console.log(JSON.stringify(summary, null, 2));
