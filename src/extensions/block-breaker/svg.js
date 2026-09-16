function attr(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function keyframes(values, times) {
  return {
    values: values.join(";"),
    keyTimes: times.join(";"),
  };
}

function n(value) {
  return Number(Number(value).toFixed(2));
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

function stars(layout, seed) {
  let n = seed;
  const dots = [];
  for (let i = 0; i < 70; i += 1) {
    n = (n * 1664525 + 1013904223) >>> 0;
    const x = (n % 1000) / 1000 * layout.width;
    n = (n * 1664525 + 1013904223) >>> 0;
    const y = (n % 1000) / 1000 * layout.height;
    n = (n * 1664525 + 1013904223) >>> 0;
    const r = 0.4 + (n % 10) / 12;
    dots.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#e9d5ff" opacity="${(0.25 + (n % 50) / 100).toFixed(2)}"/>`);
  }
  return dots.join("");
}

function breathParticles(layout, theme, dur) {
  let n = 90210;
  const bits = [];
  for (let i = 0; i < 42; i += 1) {
    n = (n * 1664525 + 1013904223) >>> 0;
    const x = 20 + ((n % 1000) / 1000) * (layout.width - 40);
    n = (n * 1664525 + 1013904223) >>> 0;
    const delay = ((n % 1000) / 1000) * 5;
    n = (n * 1664525 + 1013904223) >>> 0;
    const life = 3.8 + ((n % 1000) / 1000) * 3.4;
    n = (n * 1664525 + 1013904223) >>> 0;
    const r = 1.6 + ((n % 10) / 4);
    const color = i % 3 === 0 ? theme.breathHot : i % 3 === 1 ? theme.breath : theme.crystal;
    bits.push(`<circle cx="${x.toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" opacity="0">
      <animate attributeName="cy" from="${layout.height - 8}" to="-12" dur="${life.toFixed(2)}s" begin="${delay.toFixed(2)}s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0;0.9;0" dur="${life.toFixed(2)}s" begin="${delay.toFixed(2)}s" repeatCount="indefinite"/>
    </circle>`);
  }
  return `<g id="breath-rise">${bits.join("")}</g>`;
}

function brickOpacity(brick, total) {
  const appear = Math.max(0.02, brick.appearAt / total);
  if (brick.hitAt == null) {
    return animate("opacity", [0, 0, 1, 1], [0, Math.max(0, appear - 0.01), appear, 1], total);
  }
  const hit = Math.min(0.98, brick.hitAt / total);
  const hitStart = Math.max(appear + 0.012, hit);
  return animate("opacity", [0, 0, 1, 1, 0, 0], [0, Math.max(0, appear - 0.01), appear, hitStart, Math.min(1, hitStart + 0.004), 1], total);
}

export function renderSvg(sim) {
  const { layout, theme, sprites, calendar, frames, bricks, total } = sim;
  const paddle = sample(frames, (frame) => frame.paddleX);
  const ballX = sample(frames, (frame) => frame.ballX);
  const ballY = sample(frames, (frame) => frame.ballY);
  const minerScale = 2;
  const dragonScale = 2;
  const pipeScale = 2;
  const islandY = layout.paddleY - 48;
  const minerX = 28;
  const minerY = islandY - sprites.miner.height * minerScale + 8;
  const title = calendar.source === "repo" ? `commits em ${calendar.login}` : `commits de ${calendar.login} no GitHub`;

  const brickRects = bricks
    .map(
      (brick) => `<rect x="${brick.x}" y="${brick.y}" width="${brick.w}" height="${brick.h}" rx="2" fill="${theme.levels[brick.level]}" stroke="${theme.obsidianHi}" stroke-width="0.6" opacity="0">${brickOpacity(brick, total)}</rect>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layout.width} ${layout.height}" width="${layout.width}" height="${layout.height}" role="img" aria-label="Block Breaker dos commits anuais de ${attr(calendar.login)}">
  <defs>
    <linearGradient id="void" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="${theme.voidDeep}"/>
      <stop offset="55%" stop-color="${theme.background}"/>
      <stop offset="100%" stop-color="#1a0b2e"/>
    </linearGradient>
    <linearGradient id="breathVeil" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="${theme.breathDeep}"/>
      <stop offset="45%" stop-color="${theme.breath}"/>
      <stop offset="100%" stop-color="${theme.breathHot}"/>
    </linearGradient>
    <radialGradient id="portalGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${theme.portalGlow}" stop-opacity="0.9"/>
      <stop offset="70%" stop-color="${theme.portal}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${theme.background}" stop-opacity="0"/>
    </radialGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="2.2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#void)"/>
  ${stars(layout, hashCode(calendar.login))}
  <ellipse cx="${layout.width * 0.22}" cy="${islandY + 18}" rx="70" ry="16" fill="${theme.island}"/>
  <ellipse cx="${layout.width * 0.22}" cy="${islandY + 12}" rx="62" ry="10" fill="${theme.islandTop}"/>
  <ellipse cx="${layout.width * 0.22}" cy="${islandY + 10}" rx="18" ry="8" fill="url(#portalGlow)"/>
  <rect x="${layout.width - 70}" y="${layout.playY + 20}" width="14" height="${layout.height - layout.playY - 50}" fill="${theme.obsidian}"/>
  <rect x="${layout.width - 74}" y="${layout.playY + 12}" width="22" height="10" fill="${theme.obsidianHi}"/>
  <path d="M ${layout.width - 63} ${layout.playY + 4} l 6 10 l -12 0 z" fill="${theme.crystal}" filter="url(#glow)"/>
  <text x="${layout.pad}" y="22" fill="${theme.hud}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="13">${attr(title)}</text>
  <text x="${layout.width - layout.pad}" y="22" text-anchor="end" fill="${theme.hudMuted}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="12">${calendar.total} no ultimo ano</text>
  <g id="miner" opacity="1">
    <g transform="translate(${minerX} ${minerY})">
      ${spriteSvgInline(sprites.miner, minerScale)}
    </g>
    <animateTransform attributeName="transform" type="translate" values="-70 8; 0 0; 0 0" keyTimes="0;0.09;1" dur="${total}s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.2;0.3;1" dur="${total}s" repeatCount="indefinite"/>
  </g>
  <g id="dragon" filter="url(#glow)">
    ${spriteSvgInline(sprites.dragon, dragonScale)}
    <animateTransform attributeName="transform" type="translate" values="${layout.width + 20} 18; ${layout.width * 0.42} 78; -140 28; -140 28" keyTimes="0;0.12;0.2;1" dur="${total}s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.06;0.18;0.26;1" dur="${total}s" repeatCount="indefinite"/>
  </g>
  <ellipse cx="${layout.width * 0.48}" cy="${layout.height * 0.46}" rx="20" ry="12" fill="url(#breathVeil)" filter="url(#glow)">
    <animate attributeName="rx" values="8; 8; ${layout.width * 0.62}; ${layout.width * 0.7}" keyTimes="0;0.1;0.18;1" dur="${total}s" repeatCount="indefinite"/>
    <animate attributeName="ry" values="6; 6; ${layout.height * 0.55}; ${layout.height * 0.62}" keyTimes="0;0.1;0.18;1" dur="${total}s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0;0;0.82;0.4;0.12;0.08" keyTimes="0;0.1;0.16;0.22;0.32;1" dur="${total}s" repeatCount="indefinite"/>
  </ellipse>
  <g id="bricks">${brickRects}</g>
  ${breathParticles(layout, theme, total)}
  <g id="pipeline">
    <g>
      ${spriteSvgInline(sprites.pipeline, pipeScale)}
      <animateTransform attributeName="transform" type="translate" values="${paddle.values.map((x) => `${x} ${layout.paddleY - 2}`).join(";")}" keyTimes="${paddle.times.join(";")}" dur="${total}s" repeatCount="indefinite" calcMode="linear"/>
    </g>
    <animate attributeName="opacity" values="0;0;1;1" keyTimes="0;0.27;0.32;1" dur="${total}s" repeatCount="indefinite"/>
  </g>
  <g id="ball" filter="url(#glow)">
    <g>
      <circle r="${layout.ballR + 2}" fill="${theme.breath}" opacity="0.45"/>
      <circle r="${layout.ballR}" fill="${theme.ball}"/>
      <circle r="1.6" fill="${theme.ballCore}"/>
      <animateTransform attributeName="transform" type="translate" values="${ballX.values.map((x, i) => `${x} ${ballY.values[i]}`).join(";")}" keyTimes="${ballX.times.join(";")}" dur="${total}s" repeatCount="indefinite" calcMode="linear"/>
    </g>
    <animate attributeName="opacity" values="0;0;1;1" keyTimes="0;0.3;0.33;1" dur="${total}s" repeatCount="indefinite"/>
  </g>
</svg>`;
}

function spriteSvgInline(sprite, scale) {
  return sprite.rects
    .map(
      (rect) =>
        `<rect x="${rect.x * scale}" y="${rect.y * scale}" width="${rect.w * scale}" height="${rect.h * scale}" fill="${rect.fill}"/>`,
    )
    .join("");
}

function hashCode(text) {
  let hash = 0;
  for (const ch of text) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash || 1;
}
