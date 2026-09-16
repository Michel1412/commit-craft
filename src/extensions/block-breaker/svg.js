function attr(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function n(value) {
  return Number(Number(value).toFixed(2));
}

function keyframes(values, times) {
  return {
    values: values.join(";"),
    keyTimes: times.join(";"),
  };
}

function animate(name, values, times, dur) {
  const frames = keyframes(values.map(n), times.map((time) => Number(time.toFixed(4))));
  return `<animate attributeName="${name}" values="${frames.values}" keyTimes="${frames.keyTimes}" dur="${dur}s" repeatCount="indefinite" calcMode="linear"/>`;
}

function sample(frames, pick) {
  const values = [];
  const times = [];
  const total = frames[frames.length - 1].t;
  for (let i = 0; i < frames.length; i += 1) {
    const frame = frames[i];
    if (i > 0 && i < frames.length - 1 && i % 2 === 1) continue;
    values.push(n(pick(frame)));
    times.push(Number((frame.t / total).toFixed(4)));
  }
  if (times[0] !== 0) {
    values.unshift(values[0]);
    times.unshift(0);
  }
  if (times[times.length - 1] !== 1) {
    values.push(values[values.length - 1]);
    times.push(1);
  }
  for (let i = 1; i < times.length; i += 1) {
    if (times[i] <= times[i - 1]) times[i] = Math.min(1, times[i - 1] + 0.0001);
  }
  times[times.length - 1] = 1;
  return { values, times };
}

function brickAnim(brick, total) {
  if (brick.hitAt == null) return "";
  const hit = Math.min(0.98, brick.hitAt / total);
  return animate("opacity", [1, 1, 0, 0], [0, hit, Math.min(1, hit + 0.004), 1], total);
}

export function renderSvg(sim) {
  const { layout, theme, calendar, frames, bricks, total } = sim;
  const paddleX = sample(frames, (frame) => frame.paddleX);
  const paddleW = sample(frames, (frame) => frame.paddleW);
  const ballX = sample(frames, (frame) => frame.ballX);
  const ballY = sample(frames, (frame) => frame.ballY);
  const title = calendar.source === "repo" ? `commits em ${calendar.login}` : `commits de ${calendar.login}`;
  const minecraft = theme.skin === "minecraft";
  const brickRects = bricks
    .map((brick) => {
      const radius = minecraft ? 0 : 1.4;
      const grass =
        minecraft && brick.level === 3
          ? `<rect x="${brick.x}" y="${brick.y}" width="${brick.w}" height="2.2" fill="${theme.paddleEdge}"/>`
          : "";
      const speck =
        minecraft
          ? `<rect x="${brick.x + 2}" y="${brick.y + 3}" width="2" height="2" fill="rgba(0,0,0,0.22)"/>`
          : "";
      const mark =
        brick.bonus === "multi"
          ? `<rect x="${brick.x + brick.w / 2 - 1.6}" y="${brick.y + brick.h / 2 - 1.6}" width="3.2" height="3.2" fill="${theme.dropMulti}"/>`
          : brick.bonus === "wide"
            ? `<rect x="${brick.x + 2}" y="${brick.y + brick.h / 2 - 1}" width="${brick.w - 4}" height="2" fill="${theme.dropWide}"/>`
            : "";
      return `<g>
        <rect x="${brick.x}" y="${brick.y}" width="${brick.w}" height="${brick.h}" rx="${radius}" fill="${theme.levels[brick.level]}" stroke="${theme.brickLo}" stroke-width="0.7"/>
        ${grass}${speck}
        ${mark}
        ${brickAnim(brick, total)}
      </g>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layout.width} ${layout.height}" width="${layout.width}" height="${layout.height}" role="img" aria-label="Block Breaker tema ${attr(theme.name)} dos commits de ${attr(calendar.login)}">
  <defs>
    <linearGradient id="court" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${theme.court}"/>
      <stop offset="100%" stop-color="${theme.background}"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="1.6" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#court)"/>
  <rect x="8" y="8" width="${layout.width - 16}" height="${layout.height - 16}" fill="none" stroke="${theme.frame}" stroke-width="2" rx="6"/>
  <text x="${layout.pad}" y="24" fill="${theme.hud}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="13">BLOCK BREAKER · ${attr(theme.name.toUpperCase())} · ${attr(title)}</text>
  <text x="${layout.width - layout.pad}" y="24" text-anchor="end" fill="${theme.hudMuted}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="12">${calendar.total} commits</text>
  <g id="bricks">${brickRects}</g>
  <g id="paddle">
    <rect y="${layout.paddleY}" height="${layout.paddleH}" rx="5" fill="${theme.paddle}" stroke="${theme.paddleEdge}" stroke-width="1">
      <animate attributeName="x" values="${paddleX.values.join(";")}" keyTimes="${paddleX.times.join(";")}" dur="${total}s" repeatCount="indefinite" calcMode="linear"/>
      <animate attributeName="width" values="${paddleW.values.join(";")}" keyTimes="${paddleW.times.join(";")}" dur="${total}s" repeatCount="indefinite" calcMode="linear"/>
    </rect>
  </g>
  <g id="ball" filter="url(#glow)">
    <circle r="${layout.ballR + 1.8}" fill="${theme.ballGlow}" opacity="0.4"/>
    <circle r="${layout.ballR}" fill="${theme.ball}"/>
    <animateTransform attributeName="transform" type="translate" values="${ballX.values.map((x, i) => `${x} ${ballY.values[i]}`).join(";")}" keyTimes="${ballX.times.join(";")}" dur="${total}s" repeatCount="indefinite" calcMode="linear"/>
  </g>
</svg>`;
}
