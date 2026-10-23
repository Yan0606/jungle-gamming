import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const outDir = path.resolve("design-refs");
fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  defaultViewport: { width: 1680, height: 1050, deviceScaleFactor: 1 },
  args: ["--disable-blink-features=AutomationControlled"],
});

const page = await browser.newPage();
page.setDefaultTimeout(60000);

await page.goto(
  "https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=2-2",
  { waitUntil: "networkidle2", timeout: 90000 },
);

await new Promise((r) => setTimeout(r, 5000));

const cookie = await page.$("button::-p-text(Do not allow cookies)");
if (cookie) {
  await cookie.click();
  await new Promise((r) => setTimeout(r, 500));
}

await page.screenshot({ path: path.join(outDir, "00-loaded.png") });

const layers = await page.evaluate(() => {
  return [...document.querySelectorAll('[role="row"]')].map((row) => {
    const name = row.innerText.replace(/\s+/g, " ").trim();
    const box = row.getBoundingClientRect();
    return { name, x: box.x + 40, y: box.y + box.height / 2 };
  });
});
fs.writeFileSync(path.join(outDir, "layers.json"), JSON.stringify(layers, null, 2));

async function zoomTo(label) {
  const hit = await page.evaluate((wanted) => {
    const row = [...document.querySelectorAll('[role="row"]')].find((el) =>
      el.innerText.replace(/\s+/g, " ").includes(wanted),
    );
    if (!row) return null;
    row.scrollIntoView({ block: "center" });
    const box = row.getBoundingClientRect();
    return { x: box.x + Math.min(80, box.width / 2), y: box.y + box.height / 2 };
  }, label);
  if (!hit) return false;
  await page.mouse.click(hit.x, hit.y, { clickCount: 1 });
  await new Promise((r) => setTimeout(r, 250));
  await page.keyboard.down("Shift");
  await page.keyboard.press("Digit2");
  await page.keyboard.up("Shift");
  await new Promise((r) => setTimeout(r, 700));
  return true;
}

const targets = layers
  .map((l) => l.name)
  .filter((name) => /^(Desktop|Mobile) \//.test(name));

for (const name of targets) {
  const ok = await zoomTo(name);
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  await page.screenshot({ path: path.join(outDir, `${ok ? "fit" : "miss"}-${slug}.png`) });
}

await browser.close();
console.log("done", targets.length);
