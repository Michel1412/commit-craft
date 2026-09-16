export const CONFIG = {
  cell: 13,
  gap: 2,
  introSeconds: 0,
  gameSeconds: 26,
  fps: 16,
  ballSpeed: 198,
  paddleSpeed: 420,
  paddleWidth: 84,
  paddleMaxWidth: 150,
  paddleExpandSeconds: 9,
  header: 34,
  playHeight: 196,
  pad: 16,
  lives: 3,
  maxBalls: 5,
  dropSpeed: 92,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function maxCount(bricks) {
  return bricks.reduce((max, brick) => Math.max(max, brick.count || 0), 0);
}

export function bonusType(brick, hottest) {
  if (!brick.level) return null;
  const hot = brick.level >= 4 || (hottest > 0 && brick.count >= Math.max(3, Math.ceil(hottest * 0.6)));
  if (!hot) return null;
  return (brick.col + brick.row) % 2 === 0 ? "multi" : "wide";
}

export function layoutFrom(calendar, config = CONFIG) {
  const cols = calendar.weeks.length;
  const rows = 7;
  const gridW = cols * (config.cell + config.gap) - config.gap;
  const gridH = rows * (config.cell + config.gap) - config.gap;
  const width = config.pad * 2 + gridW;
  const gridX = config.pad;
  const gridY = config.header + 6;
  const playY = gridY + gridH + 12;
  const height = playY + config.playHeight + config.pad;
  const paddleY = height - config.pad - 16;
  return {
    cols,
    rows,
    width,
    height,
    gridX,
    gridY,
    gridW,
    gridH,
    playY,
    paddleY,
    cell: config.cell,
    gap: config.gap,
    pad: config.pad,
    header: config.header,
    paddleH: 10,
    ballR: 4.4,
  };
}

export function bricksFrom(calendar, layout) {
  const bricks = [];
  calendar.weeks.forEach((week, col) => {
    week.days.forEach((day, row) => {
      if (!day.level) return;
      bricks.push({
        id: `${col}-${row}`,
        col,
        row,
        level: day.level,
        count: day.count,
        date: day.date,
        x: layout.gridX + col * (layout.cell + layout.gap),
        y: layout.gridY + row * (layout.cell + layout.gap),
        w: layout.cell,
        h: layout.cell,
        destroyed: false,
        hitAt: null,
        bonus: null,
      });
    });
  });
  const hottest = maxCount(bricks);
  for (const brick of bricks) brick.bonus = bonusType(brick, hottest);
  return bricks;
}

function makeBall(x, y, vx, vy) {
  return { x, y, vx, vy, stuckFor: 0, anchorX: x };
}

function aimFromPaddle(state, dir = 0) {
  const speed = state.config.ballSpeed;
  const spread = clamp(dir, -1, 1) * 0.72;
  return {
    vx: speed * Math.sin(spread),
    vy: -Math.max(speed * 0.55, Math.abs(speed * Math.cos(spread))),
  };
}

function stickBall(state) {
  const { layout } = state;
  return makeBall(
    state.paddleX + state.paddleW / 2,
    layout.paddleY - layout.ballR - 1,
    0,
    0,
  );
}

function currentPaddleW(state) {
  if (state.elapsed < state.paddleUntil) return state.paddleW;
  state.paddleW = state.config.paddleWidth;
  state.paddleX = clamp(
    state.paddleX,
    state.layout.pad,
    state.layout.width - state.layout.pad - state.paddleW,
  );
  return state.paddleW;
}

function remainingBricks(state) {
  return state.bricks.filter((brick) => !brick.destroyed);
}

function bestTarget(state, ball) {
  const bricks = remainingBricks(state);
  if (!bricks.length) return null;
  const lowest = Math.max(...bricks.map((brick) => brick.y));
  const bottom = bricks.filter((brick) => brick.y >= lowest - state.layout.cell - state.layout.gap);
  const pool = bottom.length ? bottom : bricks;
  const from = ball ? ball.x : state.layout.width / 2;
  let best = pool[0];
  let bestScore = -Infinity;
  for (const brick of pool) {
    const score =
      (brick.count || 0) * 4 +
      brick.level * 10 +
      (brick.bonus ? 16 : 0) -
      Math.abs(brick.x + brick.w / 2 - from) * 0.035;
    if (score > bestScore) {
      best = brick;
      bestScore = score;
    }
  }
  return best;
}

function keepAlive(ball, speed, towardX) {
  const magSpeed = Math.max(speed, 1);
  const minVy = magSpeed * 0.3;
  const minVx = magSpeed * 0.34;
  if (Math.abs(ball.vy) < minVy) ball.vy = (ball.vy < 0 ? -1 : 1) * minVy;
  if (Math.abs(ball.vx) < minVx) {
    const dir = towardX == null ? (ball.vx < 0 ? -1 : 1) || 1 : Math.sign(towardX - ball.x) || 1;
    ball.vx = dir * minVx;
  }
  const mag = Math.hypot(ball.vx, ball.vy) || 1;
  ball.vx = (ball.vx / mag) * magSpeed;
  ball.vy = (ball.vy / mag) * magSpeed;
}

function reflectPredictX(x, vx, time, state) {
  const min = state.layout.pad + state.layout.ballR;
  const max = state.layout.width - state.layout.pad - state.layout.ballR;
  const span = Math.max(8, max - min);
  let t = x + vx * time - min;
  const period = span * 2;
  t = ((t % period) + period) % period;
  if (t > span) t = period - t;
  return min + t;
}

function mostUrgentBall(state) {
  if (!state.balls.length) return null;
  const falling = state.balls.filter((ball) => ball.vy > 0);
  const pool = falling.length ? falling : state.balls;
  return pool.slice().sort((a, b) => {
    if (a.vy > 0 && b.vy > 0) {
      return (state.layout.paddleY - a.y) / a.vy - (state.layout.paddleY - b.y) / b.vy;
    }
    return b.y - a.y;
  })[0];
}

function aimAtBricks(state) {
  const originX = state.paddleX + currentPaddleW(state) / 2;
  const originY = state.layout.paddleY - 16;
  const target = bestTarget(state, { x: originX });
  const speed = state.config.ballSpeed;
  if (!target) return aimFromPaddle(state, 0.46);
  const dx = target.x + target.w / 2 - originX;
  const dy = target.y + target.h / 2 - originY;
  const len = Math.hypot(dx, dy) || 1;
  const ball = { x: originX, vx: (dx / len) * speed, vy: (dy / len) * speed };
  if (ball.vy > 0) ball.vy = -Math.abs(ball.vy);
  keepAlive(ball, speed, target.x + target.w / 2);
  return { vx: ball.vx, vy: ball.vy };
}

function unstick(state, ball, dt) {
  const drift = Math.abs(ball.x - (ball.anchorX ?? ball.x));
  if (drift < 12) ball.stuckFor = (ball.stuckFor || 0) + dt;
  else {
    ball.anchorX = ball.x;
    ball.stuckFor = 0;
  }
  if ((ball.stuckFor || 0) < 0.85) return;
  const target = bestTarget(state, ball);
  const speed = Math.max(state.config.ballSpeed, Math.hypot(ball.vx, ball.vy));
  const toward = target ? target.x + target.w / 2 : state.layout.width - ball.x;
  ball.vx = (Math.sign(toward - ball.x) || 1) * speed * 0.78;
  ball.vy = (ball.vy < 0 ? -1 : 1) * speed * 0.62;
  keepAlive(ball, speed, toward);
  ball.stuckFor = 0;
  ball.anchorX = ball.x;
}

export function createState(calendar, config = CONFIG, options = {}) {
  const layout = layoutFrom(calendar, config);
  const bricks = bricksFrom(calendar, layout);
  const paddleW = config.paddleWidth;
  const paddleX = (layout.width - paddleW) / 2;
  const autoplay = options.autoplay !== false;
  const state = {
    calendar,
    config,
    layout,
    bricks,
    live: bricks.length,
    paddleX,
    paddleW,
    paddleUntil: 0,
    balls: [],
    drops: [],
    keys: { left: false, right: false },
    focused: !autoplay,
    score: 0,
    lives: config.lives,
    mode: "playing",
    serving: false,
    autoplay,
    loopBricks: autoplay,
    elapsed: 0,
  };
  const aim = autoplay ? aimAtBricks(state) : aimFromPaddle(state, 0.28);
  state.balls = [makeBall(paddleX + paddleW / 2, layout.paddleY - 16, aim.vx, aim.vy)];
  return state;
}

export function restart(calendar, config = CONFIG, options = {}) {
  return createState(calendar, config, options);
}

function paddleTarget(state) {
  const width = currentPaddleW(state);
  const ball = mostUrgentBall(state);
  const target = bestTarget(state, ball);
  if (ball && ball.vy < 0 && state.drops.length) {
    const drop = state.drops.reduce((best, item) => (item.y > (best?.y || 0) ? item : best), null);
    if (drop && drop.y > state.layout.playY) return drop.x;
  }
  if (!ball) return target ? target.x + target.w / 2 : state.layout.width / 2;
  if (ball.vy <= 0) return target ? target.x + target.w / 2 : ball.x;
  const time = (state.layout.paddleY - ball.y) / Math.max(ball.vy, 40);
  const intercept = reflectPredictX(ball.x, ball.vx, time, state);
  let desiredHit = 0.42;
  if (target) {
    desiredHit = clamp((target.x + target.w / 2 - intercept) / 150, -0.84, 0.84);
    if (Math.abs(desiredHit) < 0.34) desiredHit = (desiredHit < 0 ? -1 : 1) * 0.42;
  }
  return intercept - desiredHit * (width / 2);
}

function movePaddle(state, dt) {
  const { layout, config, keys } = state;
  const width = currentPaddleW(state);
  let delta = 0;
  if (!state.autoplay && (keys.left || keys.right)) {
    delta = (Number(keys.right) - Number(keys.left)) * config.paddleSpeed * dt;
  } else if (state.autoplay) {
    const center = state.paddleX + width / 2;
    const speed = config.paddleSpeed * 1.35;
    delta = clamp(paddleTarget(state) - center, -speed * dt, speed * dt);
  }
  state.paddleX = clamp(state.paddleX + delta, layout.pad, layout.width - layout.pad - width);
}

function bouncePaddle(state, ball) {
  const { layout, config } = state;
  const py = layout.paddleY;
  const width = currentPaddleW(state);
  if (ball.vy < 0) return;
  if (ball.y + layout.ballR < py) return;
  if (ball.y - layout.ballR > py + layout.paddleH) return;
  if (ball.x < state.paddleX - 2 || ball.x > state.paddleX + width + 2) return;
  let hit = clamp((ball.x - (state.paddleX + width / 2)) / (width / 2), -1, 1);
  const target = bestTarget(state, ball);
  if (state.autoplay && target) {
    const desired = clamp((target.x + target.w / 2 - ball.x) / 140, -0.85, 0.85);
    hit = Math.abs(desired) < 0.32 ? (desired < 0 ? -1 : 1) * 0.48 : desired;
  } else if (Math.abs(hit) < 0.28) {
    hit = (ball.x < layout.width / 2 ? 1 : -1) * 0.44;
  }
  const speed = Math.max(config.ballSpeed, Math.hypot(ball.vx, ball.vy) * 1.012);
  const spread = 0.95;
  ball.vx = speed * Math.sin(hit * spread);
  ball.vy = -Math.max(speed * 0.42, Math.abs(speed * Math.cos(hit * spread)));
  keepAlive(ball, speed, target ? target.x + target.w / 2 : null);
  ball.y = py - layout.ballR - 0.2;
  ball.stuckFor = 0;
}

function spawnDrop(state, brick) {
  if (!brick.bonus) return;
  state.drops.push({
    x: brick.x + brick.w / 2,
    y: brick.y + brick.h,
    type: brick.bonus,
    vy: state.config.dropSpeed,
  });
}

function hitBrick(state, ball, brick, axis) {
  brick.destroyed = true;
  brick.hitAt = state.elapsed;
  state.live -= 1;
  state.score += Math.max(1, brick.count || brick.level) * 10;
  if (axis === "x") ball.vx *= -1;
  else ball.vy *= -1;
  const target = bestTarget(state, ball);
  keepAlive(ball, Math.hypot(ball.vx, ball.vy), target ? target.x + target.w / 2 : null);
  spawnDrop(state, brick);
}

function collideBricks(state, ball, axis) {
  const { layout } = state;
  for (const brick of state.bricks) {
    if (brick.destroyed) continue;
    const nx = clamp(ball.x, brick.x, brick.x + brick.w);
    const ny = clamp(ball.y, brick.y, brick.y + brick.h);
    const dx = ball.x - nx;
    const dy = ball.y - ny;
    if (dx * dx + dy * dy > layout.ballR * layout.ballR) continue;
    hitBrick(state, ball, brick, axis);
    return;
  }
}

function splitBalls(state) {
  const extras = [];
  for (const ball of state.balls) {
    if (state.balls.length + extras.length >= state.config.maxBalls) break;
    const speed = Math.max(state.config.ballSpeed, Math.hypot(ball.vx, ball.vy));
    extras.push(makeBall(ball.x, ball.y, -ball.vy * 0.86, -Math.abs(ball.vx) - speed * 0.12));
  }
  state.balls.push(...extras.slice(0, state.config.maxBalls - state.balls.length));
  for (const ball of state.balls) keepAlive(ball, state.config.ballSpeed, bestTarget(state, ball)?.x);
}

function expandPaddle(state) {
  state.paddleW = Math.min(state.config.paddleMaxWidth, state.paddleW + 28);
  state.paddleUntil = state.elapsed + state.config.paddleExpandSeconds;
  const maxX = state.layout.width - state.layout.pad - state.paddleW;
  state.paddleX = clamp(state.paddleX, state.layout.pad, maxX);
}

function catchDrops(state, dt) {
  const width = currentPaddleW(state);
  const py = state.layout.paddleY;
  state.drops = state.drops.filter((drop) => {
    drop.y += drop.vy * dt;
    if (drop.y > state.layout.height) return false;
    const onPaddle =
      drop.y >= py - 6 &&
      drop.y <= py + state.layout.paddleH + 8 &&
      drop.x >= state.paddleX &&
      drop.x <= state.paddleX + width;
    if (!onPaddle) return true;
    if (drop.type === "multi") splitBalls(state);
    else expandPaddle(state);
    return false;
  });
}

function serveAgain(state) {
  state.drops = [];
  state.paddleW = state.config.paddleWidth;
  state.paddleUntil = 0;
  state.serving = false;
  state.mode = "playing";
  const aim = state.autoplay ? aimAtBricks(state) : aimFromPaddle(state, state.elapsed % 2 < 1 ? 0.4 : -0.4);
  state.balls = [makeBall(state.paddleX + state.paddleW / 2, state.layout.paddleY - 16, aim.vx, aim.vy)];
}

export function launch(state, dir = 0) {
  if (state.mode === "over" || state.mode === "won") return;
  state.mode = "playing";
  state.serving = false;
  const stuck = stickBall(state);
  const aim = state.autoplay ? aimAtBricks(state) : aimFromPaddle(state, dir);
  state.balls = [makeBall(stuck.x, stuck.y, aim.vx, aim.vy)];
}

function advanceBall(state, ball, dt) {
  const { layout } = state;
  const target = bestTarget(state, ball);
  const toward = target ? target.x + target.w / 2 : null;
  ball.x += ball.vx * dt;
  if (ball.x < layout.pad + layout.ballR) {
    ball.x = layout.pad + layout.ballR;
    ball.vx *= -1;
    keepAlive(ball, Math.hypot(ball.vx, ball.vy), toward);
  } else if (ball.x > layout.width - layout.pad - layout.ballR) {
    ball.x = layout.width - layout.pad - layout.ballR;
    ball.vx *= -1;
    keepAlive(ball, Math.hypot(ball.vx, ball.vy), toward);
  }
  collideBricks(state, ball, "x");

  ball.y += ball.vy * dt;
  if (ball.y < layout.header + layout.ballR) {
    ball.y = layout.header + layout.ballR;
    ball.vy *= -1;
    keepAlive(ball, Math.hypot(ball.vx, ball.vy), toward);
  }
  collideBricks(state, ball, "y");
  bouncePaddle(state, ball);
  if (state.autoplay) unstick(state, ball, dt);
}

export function step(state, dt) {
  const speeds = state.balls.map((ball) => Math.hypot(ball.vx, ball.vy));
  const speed = Math.max(state.config.ballSpeed, 1, ...speeds);
  const slices = Math.max(1, Math.ceil((speed * dt) / 3));
  const slice = dt / slices;
  for (let i = 0; i < slices; i += 1) advance(state, slice);
}

function advance(state, dt) {
  state.elapsed += dt;
  if (state.mode === "over" || state.mode === "won") return;

  if (state.serving) serveAgain(state);

  movePaddle(state, dt);
  currentPaddleW(state);
  for (const ball of state.balls) advanceBall(state, ball, dt);
  catchDrops(state, dt);
  state.balls = state.balls.filter((ball) => ball.y < state.layout.height + 18);

  if (state.live <= 0) {
    if (state.loopBricks) {
      for (const brick of state.bricks) {
        brick.destroyed = false;
        brick.hitAt = null;
      }
      state.live = state.bricks.length;
    } else {
      state.mode = "won";
      state.balls = [];
      return;
    }
  }

  if (!state.balls.length) {
    if (state.autoplay) {
      serveAgain(state);
      return;
    }
    state.lives -= 1;
    if (state.lives <= 0) {
      state.mode = "over";
      return;
    }
    serveAgain(state);
  }
}

export function simulate(calendar, config = CONFIG) {
  const state = createState(calendar, config, { autoplay: true });
  const dt = 1 / config.fps;
  const total = config.gameSeconds;
  const frames = [];
  while (state.elapsed < total - dt / 2) {
    step(state, dt);
    const ball = state.balls[0] || { x: state.paddleX + state.paddleW / 2, y: state.layout.paddleY - 16 };
    frames.push({
      t: state.elapsed,
      paddleX: state.paddleX,
      paddleW: currentPaddleW(state),
      ballX: ball.x,
      ballY: ball.y,
    });
  }
  return {
    calendar,
    config,
    layout: state.layout,
    bricks: state.bricks.map((brick) => ({ ...brick })),
    frames,
    total,
    dt,
  };
}
