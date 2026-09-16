import { readFileSync } from "node:fs";

function engineSource() {
  return readFileSync(new URL("./engine.js", import.meta.url), "utf8")
    .replace(/^import .*\n/gm, "")
    .replace(/export /g, "");
}

export function renderHtml({ calendar, theme, sprites, config }) {
  const data = JSON.stringify({ calendar, theme, sprites, config });
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Commit Craft · Block Breaker · ${escapeHtml(calendar.login)}</title>
  <style>
    :root { color-scheme: dark; }
    html, body { margin: 0; height: 100%; background: #07040f; }
    body {
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      color: #f3e8ff;
    }
    .stage {
      position: relative;
      outline: none;
      border-radius: 12px;
      box-shadow: 0 0 0 1px #3b0764, 0 24px 80px #d946ef33;
    }
    .stage:focus { box-shadow: 0 0 0 2px #22d3ee, 0 24px 80px #22d3ee33; }
    canvas { display: block; border-radius: 12px; cursor: pointer; }
    .hint {
      position: absolute;
      left: 12px;
      right: 12px;
      bottom: 12px;
      padding: 10px 12px;
      border-radius: 8px;
      background: #10081ccc;
      color: #e9d5ff;
      font-size: 12px;
      letter-spacing: 0.02em;
      pointer-events: none;
    }
    .hint strong { color: #22d3ee; }
  </style>
</head>
<body>
  <div class="stage" id="stage" tabindex="0" aria-label="Block Breaker dos commits. Clique para focar e usar A D ou setas.">
    <canvas id="game"></canvas>
    <div class="hint" id="hint">Pipeline no automatico. <strong>Clique para focar</strong> e use <strong>A / D</strong> ou <strong>← →</strong>.</div>
  </div>
  <script type="application/json" id="data">${data}</script>
  <script>
${engineSource()}
${browserScript()}
  </script>
</body>
</html>
`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");
}

function browserScript() {
  return `
const DATA = JSON.parse(document.getElementById("data").textContent);
const stage = document.getElementById("stage");
const canvas = document.getElementById("game");
const hint = document.getElementById("hint");
const ctx = canvas.getContext("2d");
const state = createState(DATA.calendar, DATA.config);
const particles = Array.from({ length: 48 }, (_, i) => ({
  x: 20 + ((i * 97) % Math.max(40, state.layout.width - 40)),
  y: (i * 53) % state.layout.height,
  r: 1.4 + (i % 5) * 0.4,
  speed: 18 + (i % 7) * 8,
  color: i % 3 === 0 ? DATA.theme.breathHot : i % 3 === 1 ? DATA.theme.breath : DATA.theme.crystal,
}));

function resize() {
  const { width, height } = state.layout;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawSprite(sprite, x, y, scale, alpha) {
  ctx.globalAlpha = alpha;
  for (const rect of sprite.rects) {
    ctx.fillStyle = rect.fill;
    ctx.fillRect(x + rect.x * scale, y + rect.y * scale, rect.w * scale, rect.h * scale);
  }
  ctx.globalAlpha = 1;
}

function introT() {
  return Math.min(1, state.elapsed / DATA.config.introSeconds);
}

function drawBackground(now) {
  const { layout } = state;
  const g = ctx.createLinearGradient(0, layout.height, 0, 0);
  g.addColorStop(0, DATA.theme.voidDeep);
  g.addColorStop(0.55, DATA.theme.background);
  g.addColorStop(1, "#1a0b2e");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, layout.width, layout.height);
  ctx.fillStyle = DATA.theme.star;
  for (let i = 0; i < 70; i += 1) {
    const x = ((i * 73) % layout.width);
    const y = ((i * 41) % layout.height);
    ctx.globalAlpha = 0.2 + (i % 5) * 0.1;
    ctx.fillRect(x, y, 1.2, 1.2);
  }
  ctx.globalAlpha = 1;
  const islandY = layout.paddleY - 48;
  ctx.fillStyle = DATA.theme.island;
  ctx.beginPath();
  ctx.ellipse(layout.width * 0.22, islandY + 18, 70, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = DATA.theme.islandTop;
  ctx.beginPath();
  ctx.ellipse(layout.width * 0.22, islandY + 12, 62, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  const portal = ctx.createRadialGradient(layout.width * 0.22, islandY + 10, 2, layout.width * 0.22, islandY + 10, 22);
  portal.addColorStop(0, DATA.theme.portalGlow);
  portal.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = portal;
  ctx.beginPath();
  ctx.ellipse(layout.width * 0.22, islandY + 10, 18, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = DATA.theme.obsidian;
  ctx.fillRect(layout.width - 70, layout.playY + 20, 14, layout.height - layout.playY - 50);
  ctx.fillStyle = DATA.theme.obsidianHi;
  ctx.fillRect(layout.width - 74, layout.playY + 12, 22, 10);
  ctx.fillStyle = DATA.theme.crystal;
  ctx.beginPath();
  ctx.moveTo(layout.width - 63, layout.playY + 4);
  ctx.lineTo(layout.width - 57, layout.playY + 14);
  ctx.lineTo(layout.width - 69, layout.playY + 14);
  ctx.closePath();
  ctx.fill();

  const minerAlpha = state.elapsed < 5.2 ? 1 : Math.max(0, 1 - (state.elapsed - 5.2) / 1.4);
  const minerWalk = Math.min(1, state.elapsed / 2.4);
  const minerX = 28 - 70 * (1 - minerWalk);
  const minerY = islandY - DATA.sprites.miner.height * 2 + 8;
  if (minerAlpha > 0) drawSprite(DATA.sprites.miner, minerX, minerY, 2, minerAlpha);

  const dragonT = Math.min(1, Math.max(0, (state.elapsed - 1.4) / 3.6));
  const dragonX = layout.width + 20 + (-140 - (layout.width + 20)) * Math.min(1, (state.elapsed - 1.4) / 3.8);
  const dragonY = 18 + 60 * Math.sin(Math.min(Math.PI, dragonT * Math.PI));
  const dragonAlpha = state.elapsed < 1.4 ? 0 : state.elapsed < 6.6 ? 1 : 0;
  if (dragonAlpha > 0) drawSprite(DATA.sprites.dragon, dragonX, dragonY, 2, dragonAlpha);

  if (state.elapsed > 2.6 && state.elapsed < 8.5) {
    const p = Math.min(1, (state.elapsed - 2.6) / 1.6);
    const fade = state.elapsed < 5 ? 1 : Math.max(0.08, 1 - (state.elapsed - 5) / 3);
    const veil = ctx.createRadialGradient(layout.width * 0.48, layout.height * 0.46, 10, layout.width * 0.48, layout.height * 0.46, layout.width * (0.2 + p * 0.7));
    veil.addColorStop(0, "rgba(240,171,252," + (0.75 * fade) + ")");
    veil.addColorStop(0.45, "rgba(217,70,239," + (0.55 * fade) + ")");
    veil.addColorStop(1, "rgba(107,33,168,0)");
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, layout.width, layout.height);
  }

  for (const particle of particles) {
    particle.y -= particle.speed * 0.016;
    if (particle.y < -10) particle.y = layout.height + 8;
    ctx.globalAlpha = 0.25 + (state.elapsed > 4.5 ? 0.55 : 0.15);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = DATA.theme.hud;
  ctx.font = "13px ui-monospace, monospace";
  ctx.textAlign = "left";
  const title = DATA.calendar.source === "repo"
    ? "commits em " + DATA.calendar.login
    : "commits de " + DATA.calendar.login + " no GitHub";
  ctx.fillText(title, layout.pad, 22);
  ctx.fillStyle = DATA.theme.hudMuted;
  ctx.textAlign = "right";
  ctx.fillText(DATA.calendar.total + " no ultimo ano", layout.width - layout.pad, 22);
  ctx.textAlign = "left";
}

function drawGame() {
  const { layout } = state;
  for (const brick of state.bricks) {
    if (brick.destroyed) continue;
    if (state.elapsed < brick.appearAt) continue;
    ctx.fillStyle = DATA.theme.levels[brick.level];
    ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
    ctx.strokeStyle = DATA.theme.obsidianHi;
    ctx.strokeRect(brick.x + 0.5, brick.y + 0.5, brick.w - 1, brick.h - 1);
  }
  if (state.elapsed >= DATA.config.introSeconds - 0.6) {
    drawSprite(DATA.sprites.pipeline, state.paddleX, layout.paddleY - 2, 2, 1);
    ctx.save();
    ctx.shadowColor = DATA.theme.breath;
    ctx.shadowBlur = 12;
    ctx.fillStyle = DATA.theme.breath;
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, layout.ballR + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = DATA.theme.ball;
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, layout.ballR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.034, (now - last) / 1000);
  last = now;
  step(state, dt);
  drawBackground(now);
  drawGame();
  requestAnimationFrame(loop);
}

function syncHint() {
  hint.textContent = state.focused
    ? "Foco na pipeline. A / D ou setas movem. Clique fora para o automatico voltar."
    : "Pipeline no automatico. Clique para focar e use A / D ou setas.";
}

stage.addEventListener("focus", () => { state.focused = true; syncHint(); });
stage.addEventListener("blur", () => { state.focused = false; state.keys.left = false; state.keys.right = false; syncHint(); });
stage.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") state.keys.left = true;
  if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") state.keys.right = true;
  if (["ArrowLeft", "ArrowRight", "a", "A", "d", "D"].includes(event.key)) event.preventDefault();
});
stage.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") state.keys.left = false;
  if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") state.keys.right = false;
});
canvas.addEventListener("click", () => stage.focus());
resize();
requestAnimationFrame(loop);
`;
}
