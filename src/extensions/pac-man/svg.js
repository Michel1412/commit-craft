function attr(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function n(value) {
  return Number(Number(value).toFixed(2));
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

function animateTransform(xSample, ySample, total) {
  const values = xSample.values.map((x, i) => `${x} ${ySample.values[i]}`);
  return `<animateTransform attributeName="transform" type="translate" values="${values.join(";")}" keyTimes="${xSample.times.join(";")}" dur="${total}s" repeatCount="indefinite" calcMode="linear"/>`;
}

function cellAnim(pellet, total) {
  if (!pellet || pellet.firstEatenAt == null) return "";
  const hit = Math.min(0.98, pellet.firstEatenAt / total);
  return `<animate attributeName="fill" values="${pellet.liveFill};${pellet.liveFill};${pellet.emptyFill};${pellet.emptyFill}" keyTimes="0;${hit};${Math.min(1, hit + 0.01).toFixed(4)};1" dur="${total}s" repeatCount="indefinite" calcMode="linear"/>`;
}

function powerStrokeAnim(pellet, total) {
  if (!pellet?.power) return "";
  if (pellet.firstEatenAt == null) return "";
  const hit = Math.min(0.98, pellet.firstEatenAt / total);
  return `<animate attributeName="stroke-opacity" values="1;1;0;0" keyTimes="0;${hit};${Math.min(1, hit + 0.01).toFixed(4)};1" dur="${total}s" repeatCount="indefinite" calcMode="linear"/>`;
}

function insect(r, color) {
  return `<g>
    <line x1="${-r}" y1="-2" x2="${-r * 1.4}" y2="-4" stroke="${color}" stroke-width="1"/>
    <line x1="${r}" y1="-2" x2="${r * 1.4}" y2="-4" stroke="${color}" stroke-width="1"/>
    <line x1="${-r * 0.2}" y1="1" x2="${-r * 1.2}" y2="3" stroke="${color}" stroke-width="1"/>
    <line x1="${r * 0.2}" y1="1" x2="${r * 1.2}" y2="3" stroke="${color}" stroke-width="1"/>
    <ellipse cx="0" cy="1" rx="${r * 0.85}" ry="${r * 0.55}" fill="${color}"/>
    <ellipse cx="0" cy="${-r * 0.45}" rx="${r * 0.45}" ry="${r * 0.38}" fill="${color}"/>
    <circle cx="-1.2" cy="${-r * 0.5}" r="0.9" fill="#fff"/>
    <circle cx="1.2" cy="${-r * 0.5}" r="0.9" fill="#fff"/>
    <circle cx="-1.1" cy="${-r * 0.45}" r="0.4" fill="#111"/>
    <circle cx="1.3" cy="${-r * 0.45}" r="0.4" fill="#111"/>
  </g>`;
}

export function renderSvg(sim) {
  const { layout, theme, calendar, frames, pellets, cells, total, config } = sim;
  const playerX = sample(frames, (frame) => frame.playerX);
  const playerY = sample(frames, (frame) => frame.playerY);
  const pelletAt = new Map(pellets.map((pellet) => [`${pellet.c}-${pellet.r}`, pellet]));
  const maxBugs = frames.reduce((max, frame) => Math.max(max, frame.bugs.length), 1);
  const bugNodes = [];
  for (let i = 0; i < maxBugs; i += 1) {
    const x = sample(frames, (frame) => frame.bugs[i]?.x ?? frame.bugs[0]?.x ?? layout.width / 2);
    const y = sample(frames, (frame) => frame.bugs[i]?.y ?? frame.bugs[0]?.y ?? layout.height / 2);
    const color = frames[frames.length - 1].bugs[i]?.color || theme.bugs[i % theme.bugs.length];
    const visible = sample(frames, (frame) => (frame.bugs[i] && !frame.bugs[i].eaten ? 1 : 0));
    const opacity = `<animate attributeName="opacity" values="${visible.values.join(";")}" keyTimes="${visible.times.join(";")}" dur="${total}s" repeatCount="indefinite" calcMode="discrete"/>`;
    bugNodes.push(`<g>${insect(layout.bugR, color)}${animateTransform(x, y, total)}${opacity}</g>`);
  }

  const cellRects = cells
    .map((cell) => {
      const pellet = pelletAt.get(`${cell.c}-${cell.r}`);
      const emptyFill = theme.levels[0];
      const liveFill = pellet ? theme.levels[pellet.level] : emptyFill;
      if (pellet) {
        pellet.liveFill = liveFill;
        pellet.emptyFill = emptyFill;
      }
      return `<g>
        <rect x="${n(cell.x)}" y="${n(cell.y)}" width="${cell.w}" height="${cell.h}" rx="2" fill="${liveFill}">${cellAnim(pellet, total)}</rect>
        ${pellet?.power ? `<rect x="${n(cell.x + 1)}" y="${n(cell.y + 1)}" width="${cell.w - 2}" height="${cell.h - 2}" rx="1.5" fill="none" stroke="${theme.power}" stroke-width="1.4">${powerStrokeAnim(pellet, total)}</rect>` : ""}
      </g>`;
    })
    .join("");

  const title = calendar.source === "repo" ? `commits em ${calendar.login}` : `commits de ${calendar.login}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${layout.width} ${layout.height}" width="${layout.width}" height="${layout.height}" role="img" aria-label="Pac-Man no calendario de commits de ${attr(calendar.login)} tema ${attr(theme.name)}">
  <rect width="100%" height="100%" fill="${theme.background}"/>
  <rect x="${layout.gridX - 6}" y="${layout.gridY - 6}" width="${layout.gridW + 12}" height="${layout.gridH + 12}" rx="6" fill="${theme.court}" stroke="${theme.maze || theme.frame}" stroke-width="2"/>
  <text x="${layout.pad}" y="22" fill="${theme.hud}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="13">PAC-MAN · BUGS${theme.id === "pacman" ? "" : ` · ${attr(theme.name.toUpperCase())}`}</text>
  <text x="${layout.width - layout.pad}" y="22" text-anchor="end" fill="${theme.hudMuted}" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="12">${calendar.total} commits · ${attr(title)}</text>
  <g id="lives">${Array.from({ length: config.lives || 5 }, (_, i) => `<circle cx="${layout.pad + 8 + i * 14}" cy="${layout.height - 14}" r="4" fill="${theme.life}"/>`).join("")}</g>
  <g id="calendar">${cellRects}</g>
  <g id="bugs">${bugNodes.join("")}</g>
  <g id="player">
    <circle r="${layout.playerR}" fill="${theme.player}"/>
    ${animateTransform(playerX, playerY, total)}
  </g>
</svg>`;
}
