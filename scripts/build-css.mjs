/**
 * 把 Tailwind 產出的 CSS 內嵌回 src/index.js。
 *
 * Worker 只有單一進入點，樣式必須是字串常數而不是外部檔案，否則每次請求
 * 都要多一次資源讀取。因此流程是：styles/app.css + styles/scan.html →
 * Tailwind 離線編譯 → 注入 src/index.js 的 STYLES 常數。
 *
 * 執行：npm run build:css
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const ENTRY = join(ROOT, "styles/app.css");
const CONTENT = join(ROOT, "styles/scan.html");
const TARGET = join(ROOT, "src/index.js");
const CLI = join(ROOT, "node_modules/@tailwindcss/cli/dist/index.mjs");

const START = "// --- generated: styles ---";
const END = "// --- end generated: styles ---";

const workDir = mkdtempSync(join(tmpdir(), "m365-css-"));
const outFile = join(workDir, "out.css");

try {
  execFileSync(
    process.execPath,
    [CLI, "-i", ENTRY, "-o", outFile, "--content", CONTENT, "--minify"],
    { stdio: "inherit" }
  );

  const css = readFileSync(outFile, "utf8").trim();
  const source = readFileSync(TARGET, "utf8");

  const startAt = source.indexOf(START);
  const endAt = source.indexOf(END);
  if (startAt < 0 || endAt < 0 || endAt < startAt) {
    throw new Error(`找不到標記，請確認 src/index.js 內含 ${START} 與 ${END}`);
  }

  const block = `${START}\nconst STYLES = ${JSON.stringify(css)};\n`;
  const next = source.slice(0, startAt) + block + source.slice(endAt);

  writeFileSync(TARGET, next);
  console.log(`已內嵌 ${css.length} bytes 樣式至 src/index.js`);
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
