// Renders video.html frame by frame in headless Chrome (the page's own render(t), so every frame is exact),
// encodes the loop as H.264 MP4 and writes stills.
//   node build.mjs --video && node export.mjs [--fps 30] [--theme light|dark] [--still 11.2]
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SKILL = process.env.ANATOMY_KIT || join(homedir(), ".claude/skills/anatomy");
const { chromePort } = await import(join(SKILL, "scripts/chrome-port.mjs"));
const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback; };
const FPS = Number(arg("--fps", 30));
const THEME = arg("--theme", "light");
const STILL = Number(arg("--still", 11.2));
const W = 1920, H = 1080;

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const profile = mkdtempSync(join(tmpdir(), "dp-export-"));
const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--hide-scrollbars", "--allow-file-access-from-files", "about:blank"]);
const port = await chromePort(chrome, profile);
const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
let loaded = () => {};
socket.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.method === "Page.loadEventFired") loaded();
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
  if (d.method === "Runtime.exceptionThrown") console.error("page exception:", d.params.exceptionDetails.exception?.description);
};
await new Promise((r) => (socket.onopen = r));
const send = (method, params = {}) => new Promise((r) => { const c = ++id; pending.set(c, r); socket.send(JSON.stringify({ id: c, method, params })); });
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.result?.value;
const shot = async (file) => writeFileSync(file, Buffer.from((await send("Page.captureScreenshot", { format: "png" })).result.data, "base64"));

await send("Runtime.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
const page = pathToFileURL(join(HERE, "video.html")).href;
await new Promise(async (r) => { loaded = r; await send("Page.navigate", { url: page }); setTimeout(r, 8000); });
if (THEME === "dark") await evaluate(`document.body.dataset.theme = "dark"`);
await new Promise((r) => setTimeout(r, 600));
const T = await evaluate("window.__T");
const out = join(HERE, "export");
mkdirSync(out, { recursive: true });

// stills: the cover moment, and the end card
await evaluate(`window.__render(${STILL})`);
await shot(join(out, `still-${THEME}.png`));
await evaluate(`window.__render(23.2)`);
await shot(join(out, `endcard-${THEME}.png`));

const frames = mkdtempSync(join(tmpdir(), "dp-frames-"));
const total = Math.round(T * FPS);
const started = Date.now();
for (let i = 0; i < total; i++) {
  await evaluate(`window.__render(${(i / FPS).toFixed(4)})`);
  await shot(join(frames, `f${String(i).padStart(5, "0")}.png`));
  if (i % 120 === 0) console.log(`frame ${i}/${total} · ${((Date.now() - started) / 1000).toFixed(0)} s`);
}
chrome.kill("SIGKILL");
rmSync(profile, { recursive: true, force: true });

const mp4 = join(out, `design-doc-pathways-${THEME}.mp4`);
const ff = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", join(frames, "f%05d.png"), "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4], { stdio: "inherit" });
rmSync(frames, { recursive: true, force: true });
if (ff.status !== 0) process.exit(1);
console.log("wrote", mp4, `(${total} frames, ${T} s at ${FPS} fps)`);
process.exit(0);
