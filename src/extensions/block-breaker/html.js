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
  <title>Commit Breaker · ${escapeHtml(theme.name)} · ${escapeHtml(calendar.login)}</title>
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
    .stage:focus { box-shadow: 0 0 0 2px ${theme.paddleEdge}, 0 18px 60px ${theme.paddleEdge}44; }
    canvas { display: block; border-radius: 10px; cursor: pointer; }
    .hint {
      position: absolute;
      left: 12px;
      right: 12px;
      bottom: 10px;
      font-size: 11px;
      color: ${theme.hudMuted};
      pointer-events: none;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="stage" id="stage" tabindex="0" aria-label="Block Breaker dos commits. Sem foco joga sozinho. Clique para jogar na hora.">
    <canvas id="game"></canvas>
    <div class="hint" id="hint">Clique para jogar · A / D ou setas · sem foco a plataforma joga sozinha</div>
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
let state = createState(DATA.calendar, DATA.config, { autoplay: true });

function resize() {
  const { width, height } = state.layout;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawBevel(brick) {
  ctx.fillStyle = DATA.theme.levels[brick.level];
  ctx.fillRect(brick.x, brick.y, brick.w, brick.h);
  if (DATA.theme.skin === "minecraft") {
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    const step = 3;
    for (let px = brick.x; px < brick.x + brick.w; px += step) {
      for (let py = brick.y; py < brick.y + brick.h; py += step) {
        if ((Math.floor((px - brick.x) / step) + Math.floor((py - brick.y) / step)) % 2 === 0) {
          ctx.fillRect(px, py, step - 0.6, step - 0.6);
        }
      }
    }
    if (brick.level === 3) {
      ctx.fillStyle = DATA.theme.paddleEdge;
      ctx.fillRect(brick.x, brick.y, brick.w, 2.4);
    }
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(brick.x, brick.y, brick.w, 2);
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.fillRect(brick.x, brick.y + brick.h - 2, brick.w, 2);
  }
  if (brick.bonus === "multi") {
    ctx.fillStyle = DATA.theme.dropMulti;
    ctx.fillRect(brick.x + brick.w / 2 - 1.6, brick.y + brick.h / 2 - 1.6, 3.2, 3.2);
  } else if (brick.bonus === "wide") {
    ctx.fillStyle = DATA.theme.dropWide;
    ctx.fillRect(brick.x + 2, brick.y + brick.h / 2 - 1, brick.w - 4, 2);
  }
}

function syncHint() {
  if (!state.autoplay && state.mode === "over") {
    hint.textContent = "Sem vidas. Clique para jogar de novo, ou clique fora para o automatico.";
    return;
  }
  if (!state.autoplay && state.mode === "won") {
    hint.textContent = "Parede limpa. Clique para jogar de novo.";
    return;
  }
  hint.textContent = state.autoplay
    ? "Automatico. Clique para jogar na hora · A / D ou setas"
    : "Voce controla · A / D ou setas · clique fora volta o automatico";
}

function draw() {
  const { layout } = state;
  ctx.fillStyle = DATA.theme.background;
  ctx.fillRect(0, 0, layout.width, layout.height);
  ctx.strokeStyle = DATA.theme.frame;
  ctx.lineWidth = 2;
  ctx.strokeRect(8.5, 8.5, layout.width - 17, layout.height - 17);

  ctx.fillStyle = DATA.theme.hud;
  ctx.font = "13px ui-monospace, monospace";
  ctx.textAlign = "left";
  ctx.fillText("BLOCK BREAKER · " + DATA.theme.name.toUpperCase() + "  " + DATA.calendar.login, layout.pad, 23);
  ctx.textAlign = "right";
  ctx.fillStyle = DATA.theme.hudMuted;
  ctx.fillText(state.score + "  " + DATA.calendar.total + " commits", layout.width - layout.pad, 23);
  ctx.textAlign = "left";
  if (state.autoplay) {
    ctx.fillStyle = DATA.theme.hudMuted;
    ctx.fillText("AUTO", layout.pad, layout.height - 10);
  } else {
    for (let i = 0; i < DATA.config.lives; i += 1) {
      ctx.beginPath();
      ctx.fillStyle = i < state.lives ? DATA.theme.life : DATA.theme.lifeEmpty;
      ctx.arc(layout.pad + 8 + i * 14, layout.height - 12, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const brick of state.bricks) {
    if (brick.destroyed) continue;
    drawBevel(brick);
  }
  for (const drop of state.drops) {
    ctx.fillStyle = drop.type === "multi" ? DATA.theme.dropMulti : DATA.theme.dropWide;
    ctx.fillRect(drop.x - 5, drop.y - 3, 10, 6);
  }

  const paddleW = currentPaddleW(state);
  ctx.fillStyle = DATA.theme.paddle;
  ctx.fillRect(state.paddleX, layout.paddleY, paddleW, layout.paddleH);
  ctx.fillStyle = DATA.theme.paddleEdge;
  ctx.fillRect(state.paddleX, layout.paddleY, paddleW, 2);

  ctx.save();
  ctx.shadowColor = DATA.theme.ballGlow;
  ctx.shadowBlur = 10;
  ctx.fillStyle = DATA.theme.ball;
  for (const ball of state.balls) {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, layout.ballR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function playNow() {
  state = restart(DATA.calendar, DATA.config, { autoplay: false });
  syncHint();
}

function demoNow() {
  state = restart(DATA.calendar, DATA.config, { autoplay: true });
  state.keys.left = false;
  state.keys.right = false;
  syncHint();
}

stage.addEventListener("click", () => stage.focus());
stage.addEventListener("focus", () => {
  if (state.autoplay || state.mode === "over" || state.mode === "won") playNow();
});
stage.addEventListener("blur", () => demoNow());

function handleKey(event, down) {
  if (state.autoplay) return;
  const left = event.key === "ArrowLeft" || event.key === "a" || event.key === "A";
  const right = event.key === "ArrowRight" || event.key === "d" || event.key === "D";
  if (!left && !right) return;
  event.preventDefault();
  if (left) state.keys.left = down;
  if (right) state.keys.right = down;
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
