export const CONFIG = {
  cell: 13,
  gap: 2,
  header: 34,
  pad: 16,
  footer: 38,
  fps: 16,
  gameSeconds: 28,
  playerSpeed: 102,
  bugSpeed: 52,
  scareSpeed: 36,
  frightenedSeconds: 5,
  respawnSeconds: 10,
  lives: 5,
  specialDays: 10,
  startBugs: 4,
  maxBugs: 8,
  eatRange: 0.55,
  dangerTiles: 3,
  shyRange: 8,
  scatterSeconds: 6,
  chaseSeconds: 12,
  releaseSeconds: [0, 2, 5.5, 10],
};

const DIRS = {
  left: { x: -1, y: 0, name: "left" },
  right: { x: 1, y: 0, name: "right" },
  up: { x: 0, y: -1, name: "up" },
  down: { x: 0, y: 1, name: "down" },
};

const DIR_LIST = [DIRS.left, DIRS.right, DIRS.up, DIRS.down];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function opposite(dir) {
  if (!dir) return null;
  return DIR_LIST.find((item) => item.x === -dir.x && item.y === -dir.y) || null;
}

export function layoutFrom(calendar, config = CONFIG) {
  const cols = Math.max(1, calendar.weeks?.length || 1);
  const rows = 7;
  const stride = config.cell + config.gap;
  const gridW = cols * stride - config.gap;
  const gridH = rows * stride - config.gap;
  const gridX = config.pad;
  const gridY = config.header + 4;
  return {
    cols,
    rows,
    cell: config.cell,
    gap: config.gap,
    stride,
    pad: config.pad,
    header: config.header,
    footer: config.footer,
    width: config.pad * 2 + gridW,
    height: gridY + gridH + config.footer,
    gridX,
    gridY,
    gridW,
    gridH,
    playerR: config.cell * 0.42,
    bugR: config.cell * 0.36,
  };
}

function inGrid(layout, c, r) {
  return c >= 0 && r >= 0 && c < layout.cols && r < layout.rows;
}

function tileCenter(layout, c, r) {
  return {
    x: layout.gridX + c * layout.stride + layout.cell / 2,
    y: layout.gridY + r * layout.stride + layout.cell / 2,
  };
}

function tileOf(layout, x, y) {
  return {
    c: clamp(Math.floor((x - layout.gridX) / layout.stride), 0, layout.cols - 1),
    r: clamp(Math.floor((y - layout.gridY) / layout.stride), 0, layout.rows - 1),
  };
}

function neighbors(layout, c, r) {
  const out = [];
  for (const dir of DIR_LIST) {
    const nc = c + dir.x;
    const nr = r + dir.y;
    if (inGrid(layout, nc, nr)) out.push({ c: nc, r: nr, dir });
  }
  return out;
}

export function mapCells(calendar, layout) {
  const cells = [];
  (calendar.weeks || []).forEach((week, c) => {
    (week.days || []).forEach((day, r) => {
      if (r > 6) return;
      const pos = tileCenter(layout, c, r);
      cells.push({
        c,
        r,
        x: layout.gridX + c * layout.stride,
        y: layout.gridY + r * layout.stride,
        cx: pos.x,
        cy: pos.y,
        w: layout.cell,
        h: layout.cell,
        level: day.level || 0,
        count: day.count || 0,
        date: day.date,
      });
    });
  });
  return cells;
}

export function pelletsFrom(calendar, layout) {
  const pellets = mapCells(calendar, layout)
    .filter((cell) => cell.count > 0 && cell.level > 0)
    .map((cell) => ({
      id: `${cell.c}-${cell.r}-${cell.date}`,
      c: cell.c,
      r: cell.r,
      x: cell.cx,
      y: cell.cy,
      level: cell.level,
      count: cell.count,
      date: cell.date,
      power: false,
      eaten: false,
      eatenAt: null,
    }));
  const ranked = pellets.slice().sort((a, b) => (b.count || 0) - (a.count || 0) || String(a.date).localeCompare(String(b.date)));
  for (const pellet of ranked.slice(0, CONFIG.specialDays)) pellet.power = true;
  return pellets;
}

function firstEmpty(layout, cells) {
  const empty = cells.find((cell) => !cell.count) || cells[0];
  return empty ? { c: empty.c, r: empty.r } : { c: 0, r: 3 };
}

function bugHomes(layout, playerSpawn) {
  const homes = [];
  const corners = [
    { c: layout.cols - 1, r: 0 },
    { c: layout.cols - 1, r: layout.rows - 1 },
    { c: Math.floor(layout.cols * 0.75), r: 0 },
    { c: Math.floor(layout.cols * 0.75), r: layout.rows - 1 },
    { c: layout.cols - 2, r: 3 },
    { c: Math.floor(layout.cols * 0.6), r: 6 },
    { c: layout.cols - 3, r: 1 },
    { c: Math.floor(layout.cols * 0.85), r: 5 },
  ];
  for (const home of corners) {
    const c = clamp(home.c, 0, layout.cols - 1);
    const r = clamp(home.r, 0, layout.rows - 1);
    if (c === playerSpawn.c && r === playerSpawn.r) continue;
    homes.push({ c, r });
  }
  if (!homes.length) homes.push({ c: layout.cols - 1, r: 0 });
  return homes;
}

function makeActor(layout, spawn, dir) {
  const pos = tileCenter(layout, spawn.c, spawn.r);
  return { c: spawn.c, r: spawn.r, x: pos.x, y: pos.y, dir, nextDir: dir };
}

function makeBug(layout, index, colors, homes, elapsed = 0, config = CONFIG) {
  const spawn = homes[index % homes.length];
  const bug = makeActor(layout, spawn, index % 2 === 0 ? DIRS.left : DIRS.up);
  bug.color = colors[index % colors.length] || "#ff0000";
  bug.scared = false;
  bug.eaten = false;
  bug.home = spawn;
  bug.persona = index % 4;
  bug.releaseAt = elapsed + releaseDelay(index, config);
  bug.returnAt = 0;
  return bug;
}

function releaseDelay(index, config = CONFIG) {
  const times = config.releaseSeconds || [0, 2, 5.5, 10];
  if (index < times.length) return times[index];
  return times[times.length - 1] + (index - times.length + 1) * 5;
}

function released(state, bug) {
  return !bug.eaten && state.elapsed >= (bug.releaseAt || 0);
}

function remainingPellets(state) {
  return state.pellets.filter((pellet) => !pellet.eaten);
}

function livingBugs(state) {
  return state.bugs.filter((bug) => !bug.eaten);
}

function atTileCenter(state, actor) {
  const center = tileCenter(state.layout, actor.c, actor.r);
  return Math.hypot(actor.x - center.x, actor.y - center.y) < 0.05;
}

function snapToTile(state, actor) {
  const center = tileCenter(state.layout, actor.c, actor.r);
  actor.x = center.x;
  actor.y = center.y;
}

function canWalk(state, actor, dir) {
  return Boolean(dir) && inGrid(state.layout, actor.c + dir.x, actor.r + dir.y);
}

function pickWalkDir(state, actor) {
  const options = neighbors(state.layout, actor.c, actor.r);
  if (actor.nextDir && canWalk(state, actor, actor.nextDir)) return actor.nextDir;
  if (actor.dir && canWalk(state, actor, actor.dir)) return actor.dir;
  const rev = opposite(actor.dir);
  const keep = options.find((step) => !rev || step.dir !== rev);
  if (keep) return keep.dir;
  return options[0]?.dir || actor.dir;
}

function moveActor(state, actor, speed, dt) {
  if (atTileCenter(state, actor)) {
    snapToTile(state, actor);
    actor.dir = pickWalkDir(state, actor);
    actor.nextDir = actor.nextDir || actor.dir;
  }
  if (!canWalk(state, actor, actor.dir)) {
    actor.dir = pickWalkDir(state, actor);
    if (!canWalk(state, actor, actor.dir)) return;
  }
  const dest = tileCenter(state.layout, actor.c + actor.dir.x, actor.r + actor.dir.y);
  const dist = Math.max(0, speed * dt);
  const remain = Math.hypot(dest.x - actor.x, dest.y - actor.y);
  if (dist >= remain) {
    actor.c += actor.dir.x;
    actor.r += actor.dir.y;
    actor.x = dest.x;
    actor.y = dest.y;
  } else {
    actor.x += actor.dir.x * dist;
    actor.y += actor.dir.y * dist;
  }
}

function dirToward(state, from, goal) {
  const dc = goal.c - from.c;
  const dr = goal.r - from.r;
  if (!dc && !dr) return pickWalkDir(state, from);
  const horiz = dc > 0 ? DIRS.right : dc < 0 ? DIRS.left : null;
  const vert = dr > 0 ? DIRS.down : dr < 0 ? DIRS.up : null;
  const absC = Math.abs(dc);
  const absR = Math.abs(dr);
  if (from.dir && horiz && from.dir === horiz) return horiz;
  if (from.dir && vert && from.dir === vert) return vert;
  if (absC >= absR && horiz && canWalk(state, from, horiz)) return horiz;
  if (vert && canWalk(state, from, vert)) return vert;
  if (horiz && canWalk(state, from, horiz)) return horiz;
  return pickWalkDir(state, from);
}

function sweepPellet(state) {
  const left = remainingPellets(state);
  if (!left.length) return null;
  const row = state.player.r;
  const same = [];
  for (const pellet of left) {
    if (pellet.r === row) same.push(pellet);
  }
  if (same.length) {
    const goingRight = !state.player.dir || state.player.dir.x >= 0;
    let ahead = null;
    let aheadD = Infinity;
    let closest = same[0];
    let closestD = Infinity;
    for (const pellet of same) {
      const d = Math.abs(pellet.c - state.player.c);
      if (d < closestD) {
        closest = pellet;
        closestD = d;
      }
      const inFront = goingRight ? pellet.c >= state.player.c : pellet.c <= state.player.c;
      if (inFront && d < aheadD) {
        ahead = pellet;
        aheadD = d;
      }
    }
    return ahead || closest;
  }
  let best = left[0];
  let bestD = Infinity;
  for (const pellet of left) {
    const d = Math.abs(pellet.r - row) * 80 + Math.abs(pellet.c - state.player.c);
    if (d < bestD) {
      best = pellet;
      bestD = d;
    }
  }
  return best;
}

function nearestPower(state) {
  let best = null;
  let bestD = Infinity;
  for (const pellet of state.pellets) {
    if (pellet.eaten || !pellet.power) continue;
    const d = manhattan(state.player, pellet);
    if (d < bestD) {
      best = pellet;
      bestD = d;
    }
  }
  return best;
}

function nearestBug(state) {
  let best = null;
  let bestD = Infinity;
  for (const bug of livingBugs(state)) {
    if (!released(state, bug)) continue;
    const d = manhattan(state.player, bug);
    if (d < bestD) {
      best = bug;
      bestD = d;
    }
  }
  return best;
}

function huntingBugs(state) {
  const out = [];
  for (const bug of state.bugs) {
    if (bug.eaten || bug.scared || !released(state, bug)) continue;
    out.push(bug);
  }
  return out;
}

function minGhostDist(state, tile) {
  let min = Infinity;
  for (const bug of huntingBugs(state)) {
    const d = manhattan(tile, bug);
    if (d < min) min = d;
  }
  return min;
}

function manhattan(a, b) {
  return Math.abs(a.c - b.c) + Math.abs(a.r - b.r);
}

function powered(state) {
  return state.elapsed < (state.frightUntil || 0);
}

function scatterMode(state) {
  const scatter = Math.max(2.5, (state.config.scatterSeconds || 6) - (state.round - 1) * 0.8);
  const chase = (state.config.chaseSeconds || 12) + (state.round - 1);
  return state.elapsed % (scatter + chase) < scatter;
}

function clampTile(layout, c, r) {
  return { c: clamp(c, 0, layout.cols - 1), r: clamp(r, 0, layout.rows - 1) };
}

function bugTarget(state, bug, index) {
  const layout = state.layout;
  const corners = [
    { c: layout.cols - 1, r: 0 },
    { c: 0, r: 0 },
    { c: layout.cols - 1, r: layout.rows - 1 },
    { c: 0, r: layout.rows - 1 },
  ];
  const scatter = corners[index % 4];
  const pac = state.player;
  const dir = pac.dir || DIRS.right;
  if (scatterMode(state)) return scatter;
  if ((bug.persona ?? index) % 4 === 3 && manhattan(bug, pac) < (state.config.shyRange || 8)) {
    return scatter;
  }
  if ((bug.persona ?? index) % 4 === 1) {
    return clampTile(layout, pac.c + dir.x * 4, pac.r + dir.y * 4);
  }
  if ((bug.persona ?? index) % 4 === 2) {
    return clampTile(layout, pac.c + dir.x * 2, pac.r + dir.y * 2);
  }
  return { c: pac.c, r: pac.r };
}

function safeDir(state, preferred) {
  const options = neighbors(state.layout, state.player.c, state.player.r);
  if (!options.length) return preferred;
  const rev = opposite(state.player.dir);
  const pellet = sweepPellet(state);
  let best = preferred || options[0].dir;
  let bestScore = -Infinity;
  for (const step of options) {
    const minD = minGhostDist(state, step);
    let score = minD * 3;
    if (preferred && step.dir === preferred) score += 1.25;
    if (rev && step.dir === rev) score -= 1.6;
    if (pellet) score -= manhattan(step, pellet) * 0.06;
    if (score > bestScore) {
      best = step.dir;
      bestScore = score;
    }
  }
  return best;
}

function autoplayPlayer(state) {
  if (powered(state)) {
    const prey = nearestBug(state);
    if (prey && manhattan(state.player, prey) <= 12) {
      state.player.nextDir = dirToward(state, state.player, prey);
      return;
    }
  }
  const threat = minGhostDist(state, state.player);
  const power = nearestPower(state);
  const danger = state.config.dangerTiles || 3;
  if (!powered(state) && power && threat <= danger + 1 && manhattan(state.player, power) <= 8) {
    state.player.nextDir = safeDir(state, dirToward(state, state.player, power));
    return;
  }
  const pellet = sweepPellet(state);
  if (!pellet) return;
  const preferred = dirToward(state, state.player, pellet);
  if (!powered(state) && threat <= danger) {
    state.player.nextDir = safeDir(state, preferred);
    return;
  }
  state.player.nextDir = preferred;
}

function pickFleeDir(state, bug) {
  const options = neighbors(state.layout, bug.c, bug.r);
  const rev = opposite(bug.dir);
  let best = null;
  let bestD = -Infinity;
  for (const step of options) {
    if (rev && step.dir === rev && options.length > 1) continue;
    const d = manhattan(step, state.player);
    if (d > bestD) {
      best = step;
      bestD = d;
    }
  }
  return (best || options[0])?.dir || bug.dir;
}

function autoplayBug(state, bug, index) {
  if (bug.eaten || !released(state, bug)) return;
  if (bug.scared) bug.nextDir = pickFleeDir(state, bug);
  else bug.nextDir = dirToward(state, bug, bugTarget(state, bug, index));
}

function eatPellets(state) {
  const pc = state.player.c;
  const pr = state.player.r;
  const range = state.layout.cell * state.config.eatRange;
  for (const pellet of state.pellets) {
    if (pellet.eaten || pellet.c !== pc || pellet.r !== pr) continue;
    if (Math.hypot(pellet.x - state.player.x, pellet.y - state.player.y) > range) continue;
    pellet.eaten = true;
    pellet.eatenAt = state.elapsed;
    if (pellet.firstEatenAt == null) pellet.firstEatenAt = state.elapsed;
    state.live -= 1;
    state.score += pellet.power ? 80 : Math.max(10, (pellet.count || 1) * 10);
    if (pellet.power) {
      state.frightUntil = state.elapsed + state.config.frightenedSeconds;
      for (const bug of state.bugs) {
        if (!bug.eaten) bug.scared = true;
      }
    }
  }
}

function restoreMap(state) {
  for (const pellet of state.pellets) {
    pellet.eaten = false;
    pellet.eatenAt = null;
  }
  state.live = state.pellets.length;
  state.frightUntil = 0;
}

function loseLife(state) {
  state.lives -= 1;
  state.frightUntil = 0;
  for (const bug of state.bugs) bug.scared = false;
  resetActors(state);
  if (state.lives > 0) return;
  if (state.autoplay) {
    const next = createState(state.calendar, state.config, {
      autoplay: true,
      bugColors: state.bugColors,
    });
    Object.assign(state, next);
    return;
  }
  state.mode = "over";
}

function collideBugs(state) {
  const range = state.layout.cell * 0.55;
  for (const bug of state.bugs) {
    if (bug.eaten || !released(state, bug)) continue;
    if (Math.abs(bug.c - state.player.c) + Math.abs(bug.r - state.player.r) > 1) continue;
    if (Math.hypot(bug.x - state.player.x, bug.y - state.player.y) > range) continue;
    if (bug.scared || powered(state)) {
      bug.eaten = true;
      bug.scared = false;
      state.score += 200;
      bug.c = bug.home.c;
      bug.r = bug.home.r;
      snapToTile(state, bug);
      bug.dir = DIRS.left;
      bug.nextDir = DIRS.left;
      bug.returnAt = state.elapsed + state.config.respawnSeconds;
      if (state.autoplay) autoplayPlayer(state);
    } else {
      loseLife(state);
      return;
    }
  }
}

function resetActors(state) {
  const player = makeActor(state.layout, state.playerSpawn, DIRS.right);
  Object.assign(state.player, player);
  state.bugs.forEach((bug, index) => {
    const spawn = state.bugHomes[index % state.bugHomes.length];
    const pos = tileCenter(state.layout, spawn.c, spawn.r);
    bug.c = spawn.c;
    bug.r = spawn.r;
    bug.x = pos.x;
    bug.y = pos.y;
    bug.home = spawn;
    bug.eaten = false;
    bug.scared = false;
    bug.persona = index % 4;
    bug.releaseAt = state.elapsed + releaseDelay(index, state.config);
    bug.returnAt = 0;
    bug.dir = index % 2 === 0 ? DIRS.left : DIRS.up;
    bug.nextDir = bug.dir;
  });
}

function completeRound(state) {
  state.round += 1;
  const colors = state.bugColors || ["#ff0000", "#ffb8ff", "#00ffff", "#ffb852"];
  if (state.bugs.length < state.config.maxBugs) {
    state.bugs.push(makeBug(state.layout, state.bugs.length, colors, state.bugHomes, state.elapsed, state.config));
  }
  restoreMap(state);
  resetActors(state);
}

export function createState(calendar, config = CONFIG, options = {}) {
  const layout = layoutFrom(calendar, config);
  const cells = mapCells(calendar, layout);
  const pellets = pelletsFrom(calendar, layout);
  const playerSpawn = firstEmpty(layout, cells);
  const homes = bugHomes(layout, playerSpawn);
  const autoplay = options.autoplay !== false;
  const colors = options.bugColors || ["#ff0000", "#88cc44", "#ffb852", "#00ffff"];
  const bugs = [];
  for (let i = 0; i < Math.max(1, config.startBugs); i += 1) {
    bugs.push(makeBug(layout, i, colors, homes, 0, config));
  }
  return {
    calendar,
    config,
    layout,
    cells,
    pellets,
    live: pellets.length,
    playerSpawn,
    bugHomes: homes,
    player: makeActor(layout, playerSpawn, DIRS.right),
    bugs,
    bugColors: colors,
    keys: { left: false, right: false, up: false, down: false },
    score: 0,
    lives: config.lives,
    round: 1,
    mode: "playing",
    autoplay,
    elapsed: 0,
    frightUntil: 0,
  };
}

export function restart(calendar, config = CONFIG, options = {}) {
  return createState(calendar, config, options);
}

function readKeys(state) {
  const { keys } = state;
  if (keys.left) return DIRS.left;
  if (keys.right) return DIRS.right;
  if (keys.up) return DIRS.up;
  if (keys.down) return DIRS.down;
  return null;
}

export function step(state, dt) {
  const speed = Math.max(state.config.playerSpeed, state.config.bugSpeed + state.round * 3);
  const slices = Math.max(1, Math.ceil((speed * dt) / (state.layout.cell * 0.28)));
  const slice = dt / slices;
  for (let i = 0; i < slices; i += 1) advance(state, slice);
}

function advance(state, dt) {
  if (state.mode === "over" || state.mode === "won") return;
  state.elapsed += dt;
  if (state.elapsed > state.frightUntil) {
    for (const bug of state.bugs) bug.scared = false;
  }
  for (const bug of state.bugs) {
    if (bug.eaten && state.elapsed >= (bug.returnAt || 0)) {
      bug.eaten = false;
      bug.scared = powered(state);
      bug.c = bug.home.c;
      bug.r = bug.home.r;
      snapToTile(state, bug);
      const idx = state.bugs.indexOf(bug);
      bug.nextDir = bug.scared ? pickFleeDir(state, bug) : dirToward(state, bug, bugTarget(state, bug, idx));
      bug.dir = bug.nextDir;
    }
  }
  collideBugs(state);

  if (state.autoplay) autoplayPlayer(state);
  else {
    const wanted = readKeys(state);
    if (wanted) state.player.nextDir = wanted;
  }

  moveActor(state, state.player, state.config.playerSpeed, dt);
  eatPellets(state);

  state.bugs.forEach((bug, index) => {
    if (bug.eaten || !released(state, bug)) return;
    autoplayBug(state, bug, index);
    const speed = bug.scared
      ? state.config.scareSpeed
      : Math.max(32, state.config.bugSpeed + state.round * 2 - index * 2);
    moveActor(state, bug, speed, dt);
  });
  collideBugs(state);

  if (state.live <= 0 && state.pellets.length) completeRound(state);
}

export function simulate(calendar, config = CONFIG, options = {}) {
  const state = createState(calendar, config, { ...options, autoplay: true });
  const dt = 1 / config.fps;
  const total = config.gameSeconds;
  const frames = [];
  while (state.elapsed < total - dt / 2) {
    step(state, dt);
    frames.push({
      t: state.elapsed,
      playerX: state.player.x,
      playerY: state.player.y,
      playerDir: state.player.dir?.name || "right",
      bugs: state.bugs.map((bug) => ({
        x: bug.x,
        y: bug.y,
        scared: bug.scared,
        eaten: bug.eaten,
        color: bug.color,
      })),
    });
  }
  return {
    calendar,
    config,
    layout: state.layout,
    cells: state.cells,
    pellets: state.pellets.map((pellet) => ({ ...pellet })),
    frames,
    total,
    dt,
    round: state.round,
    score: state.score,
  };
}
