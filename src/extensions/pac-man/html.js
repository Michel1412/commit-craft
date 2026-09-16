import { readFileSync } from "node:fs";

function engineSource() {
  return readFileSync(new URL("./engine.js", import.meta.url), "utf8")
    .replace(/^import .*\n/gm, "")
    .replace(/export /g, "");
}

export function renderHtml({ calendar, theme, config }) {
  const data = JSON.stringify({ calendar, theme, config });
  const scheme = theme.id === "branco" ? "light" : "dark";
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Commit Breaker · Pac-Man · ${escapeHtml(theme.name)} · ${escapeHtml(calendar.login)}</title>
  <style>
    :root { color-scheme: ${scheme}; }
    html, body { margin: 0; height: 100%; background: ${theme.page}; }
    body {
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      color: ${theme.hud};
    }
    .stage {
      position: relative;
      outline: none;
      border-radius: 10px;
      box-shadow: 0 0 0 1px ${theme.frame}, 0 18px 60px ${theme.frame}66;
    }
    .stage:focus { box-shadow: 0 0 0 2px ${theme.player}, 0 18px 60px ${theme.player}44; }
    canvas { display: block; border-radius: 10px; cursor: pointer; }
    .hint {
      position: absolute;
      left: 12px;
      right: 12px;
      bottom: 6px;
      font-size: 11px;
      color: ${theme.hudMuted};
      pointer-events: none;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="stage" id="stage" tabindex="0" aria-label="Pac-Man no calendario de commits. Sem foco joga sozinho. Clique para jogar na hora.">
    <canvas id="game"></canvas>
    <div class="hint" id="hint">Clique para jogar · WASD ou setas · sem foco o automatico coleta os commits</div>
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
const options = { autoplay: true, bugColors: DATA.theme.bugs };
let state = createState(DATA.calendar, DATA.config, options);

function resize() {
  const { width, height } = state.layout;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function syncHint() {
  if (!state.autoplay && state.mode === "over") {
    hint.textContent = "Sem vidas. Clique para jogar de novo, ou clique fora para o automatico.";
    return;
  }
  hint.textContent = state.autoplay
    ? "Automatico. Clique para jogar · WASD ou setas"
    : "Voce controla · WASD ou setas · clique fora volta o automatico";
}

function drawMap() {
  const { layout } = state;
  ctx.fillStyle = DATA.theme.background;
  ctx.fillRect(0, 0, layout.width, layout.height);
  ctx.fillStyle = DATA.theme.court;
  ctx.fillRect(layout.gridX - 6, layout.gridY - 6, layout.gridW + 12, layout.gridH + 12);
  ctx.strokeStyle = DATA.theme.maze || DATA.theme.frame;
  ctx.lineWidth = 2;
  ctx.strokeRect(layout.gridX - 6.5, layout.gridY - 6.5, layout.gridW + 13, layout.gridH + 13);
  for (const cell of state.cells) {
    const pellet = state.pellets.find((item) => item.c === cell.c && item.r === cell.r);
    const live = cell.count > 0 && pellet && !pellet.eaten;
    ctx.fillStyle = live ? DATA.theme.levels[cell.level] : DATA.theme.levels[0];
    ctx.beginPath();
    ctx.roundRect(cell.x, cell.y, cell.w, cell.h, 2);
    ctx.fill();
    if (live && pellet.power) {
      ctx.strokeStyle = DATA.theme.power;
      ctx.lineWidth = 1.6;
      ctx.strokeRect(cell.x + 1, cell.y + 1, cell.w - 2, cell.h - 2);
    }
  }
}

function drawPlayer() {
  const mouth = (Math.sin(state.elapsed * 16) + 1) * 0.32;
  const dir = state.player.dir || { x: 1, y: 0 };
  const angle = Math.atan2(dir.y, dir.x);
  ctx.fillStyle = DATA.theme.player;
  ctx.beginPath();
  ctx.moveTo(state.player.x, state.player.y);
  ctx.arc(state.player.x, state.player.y, state.layout.playerR, angle + mouth, angle + Math.PI * 2 - mouth);
  ctx.closePath();
  ctx.fill();
}

function drawBug(bug) {
  if (bug.eaten) return;
  const t = state.elapsed;
  const flash = bug.scared && Math.floor(t * 8) % 2 === 0;
  const color = bug.scared ? (flash ? DATA.theme.scaredFlash : DATA.theme.scared) : bug.color;
  const x = bug.x;
  const y = bug.y;
  const r = state.layout.bugR;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 8) * 0.12);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.1;
  ctx.lineCap = "round";
  for (let i = -1; i <= 1; i += 1) {
    const wobble = Math.sin(t * 14 + i) * 1.2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, 0);
    ctx.lineTo(-r * 1.15, i * 2.1 + wobble);
    ctx.moveTo(r * 0.2, 0);
    ctx.lineTo(r * 1.15, i * 2.1 - wobble);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-1.4, -r * 0.7);
  ctx.quadraticCurveTo(-2.4, -r * 1.5, -3.2, -r * 1.7);
  ctx.moveTo(1.4, -r * 0.7);
  ctx.quadraticCurveTo(2.4, -r * 1.5, 3.2, -r * 1.7);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0.4, r * 0.85, r * 0.62, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.45, r * 0.48, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  if (!bug.eaten) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-1.3, -r * 0.5, 1.15, 0, Math.PI * 2);
    ctx.arc(1.3, -r * 0.5, 1.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#111";
    ctx.beginPath();
    ctx.arc(-1.15, -r * 0.45, 0.55, 0, Math.PI * 2);
    ctx.arc(1.45, -r * 0.45, 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawHud() {
  const { layout } = state;
  ctx.fillStyle = DATA.theme.hud;
  ctx.font = "13px ui-monospace, monospace";
  ctx.textAlign = "left";
  ctx.fillText("PAC-MAN · BUGS" + (DATA.theme.id === "pacman" ? "" : " · " + DATA.theme.name.toUpperCase()), layout.pad, 22);
  ctx.textAlign = "right";
  ctx.fillStyle = DATA.theme.hudMuted;
  ctx.fillText("R" + state.round + "  " + state.score + "  " + DATA.calendar.total + " commits", layout.width - layout.pad, 22);
  for (let i = 0; i < DATA.config.lives; i += 1) {
    ctx.beginPath();
    ctx.fillStyle = i < state.lives ? DATA.theme.life : DATA.theme.lifeEmpty;
    ctx.arc(layout.pad + 8 + i * 14, layout.height - 14, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function draw() {
  drawMap();
  for (const bug of state.bugs) drawBug(bug);
  drawPlayer();
  drawHud();
}

function playNow() {
  state = restart(DATA.calendar, DATA.config, { autoplay: false, bugColors: DATA.theme.bugs });
  syncHint();
}

function demoNow() {
  state = restart(DATA.calendar, DATA.config, { autoplay: true, bugColors: DATA.theme.bugs });
  state.keys.left = state.keys.right = state.keys.up = state.keys.down = false;
  syncHint();
}

stage.addEventListener("click", () => stage.focus());
stage.addEventListener("focus", () => {
  if (state.autoplay || state.mode === "over") playNow();
});
stage.addEventListener("blur", () => demoNow());

function handleKey(event, down) {
  if (state.autoplay) return;
  const map = {
    ArrowLeft: "left", a: "left", A: "left",
    ArrowRight: "right", d: "right", D: "right",
    ArrowUp: "up", w: "up", W: "up",
    ArrowDown: "down", s: "down", S: "down",
  };
  const key = map[event.key];
  if (!key) return;
  event.preventDefault();
  state.keys.left = state.keys.right = state.keys.up = state.keys.down = false;
  state.keys[key] = down;
}

window.addEventListener("keydown", (event) => handleKey(event, true));
window.addEventListener("keyup", (event) => handleKey(event, false));

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.034, (now - last) / 1000);
  last = now;
  step(state, dt);
  syncHint();
  draw();
  requestAnimationFrame(loop);
}

resize();
syncHint();
requestAnimationFrame(loop);
`;
}
