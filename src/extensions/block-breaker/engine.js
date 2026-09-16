export const CONFIG = {
  cell: 12,
  gap: 3,
  introSeconds: 8,
  gameSeconds: 22,
  fps: 12,
  ballSpeed: 132,
  paddleSpeed: 320,
  paddleWidth: 96,
  header: 38,
  playHeight: 176,
  pad: 18,
};

function aimVector(bricks, paddleX, layout, config) {
  const originX = paddleX + layout.paddleW / 2;
  const originY = layout.paddleY - 16;
  if (!bricks.length) {
    return { vx: config.ballSpeed * 0.45, vy: -config.ballSpeed * 0.89 };
  }
  const hottest = [...bricks].sort((a, b) => b.level - a.level || b.count - a.count)[0];
  const dx = hottest.x + hottest.w / 2 - originX;
  const dy = hottest.y + hottest.h / 2 - originY;
  const len = Math.hypot(dx, dy) || 1;
  return {
    vx: (dx / len) * config.ballSpeed,
    vy: (dy / len) * config.ballSpeed,
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function layoutFrom(calendar, config = CONFIG) {
  const cols = calendar.weeks.length;
  const rows = 7;
  const gridW = cols * (config.cell + config.gap) - config.gap;
  const gridH = rows * (config.cell + config.gap) - config.gap;
  const width = config.pad * 2 + gridW;
  const gridX = config.pad;
  const gridY = config.header + 8;
  const playY = gridY + gridH + 10;
  const height = playY + config.playHeight + config.pad;
  const paddleY = height - config.pad - 18;
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
    paddleW: config.paddleWidth,
    paddleH: 12,
    ballR: 4.6,
  };
}

export function bricksFrom(calendar, layout) {
  const bricks = [];
  calendar.weeks.forEach((week, col) => {
    week.days.forEach((day, row) => {
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
        appearAt: 4.6 + (6 - row) * 0.13 + col * 0.006,
      });
    });
  });
  return bricks;
}

export function createState(calendar, config = CONFIG) {
  const layout = layoutFrom(calendar, config);
  const bricks = bricksFrom(calendar, layout);
  const paddleX = (layout.width - layout.paddleW) / 2;
  const aim = aimVector(bricks, paddleX, layout, config);
  return {
    calendar,
    config,
    layout,
    bricks,
    live: bricks.filter((brick) => brick.level).length,
    paddleX,
    ball: {
      x: paddleX + layout.paddleW / 2,
      y: layout.paddleY - 16,
      vx: aim.vx,
      vy: aim.vy,
    },
    serve: true,
    introLeft: config.introSeconds,
    elapsed: 0,
    keys: { left: false, right: false },
    focused: false,
    score: 0,
    loopBricks: true,
  };
}

function paddleTarget(state) {
  const { ball, layout } = state;
  if (ball.vy <= 0) return ball.x;
  const time = (layout.paddleY - ball.y) / Math.max(ball.vy, 40);
  return ball.x + ball.vx * time * 0.92;
}

function movePaddle(state, dt) {
  const { layout, config, keys, focused } = state;
  let delta = 0;
  if (focused && (keys.left || keys.right)) {
    delta = (Number(keys.right) - Number(keys.left)) * config.paddleSpeed * dt;
  } else {
    const target = paddleTarget(state);
    const center = state.paddleX + layout.paddleW / 2;
    delta = clamp(target - center, -config.paddleSpeed * dt, config.paddleSpeed * dt);
  }
  state.paddleX = clamp(state.paddleX + delta, layout.pad, layout.width - layout.pad - layout.paddleW);
}

function bouncePaddle(state) {
  const { ball, layout, config } = state;
  const py = layout.paddleY;
  if (ball.vy < 0) return;
  if (ball.y + layout.ballR < py) return;
  if (ball.y - layout.ballR > py + layout.paddleH) return;
  if (ball.x < state.paddleX - 2 || ball.x > state.paddleX + layout.paddleW + 2) return;
  const hit = clamp((ball.x - (state.paddleX + layout.paddleW / 2)) / (layout.paddleW / 2), -1, 1);
  const speed = Math.max(config.ballSpeed, Math.hypot(ball.vx, ball.vy) * 1.01);
  const spread = 0.9;
  ball.vx = speed * Math.sin(hit * spread);
  ball.vy = -Math.max(speed * 0.4, Math.abs(speed * Math.cos(hit * spread)));
  ball.y = py - layout.ballR - 0.2;
}

function keepMoving(ball, speed) {
  const minVy = speed * 0.32;
  if (Math.abs(ball.vy) >= minVy) return;
  ball.vy = (ball.vy < 0 ? -1 : 1) * minVy;
  const vxSign = ball.vx < 0 ? -1 : 1;
  ball.vx = vxSign * Math.sqrt(Math.max(speed * speed - ball.vy * ball.vy, 1));
}

function hitBrick(state, brick, axis, time) {
  brick.destroyed = true;
  brick.hitAt = time;
  state.live -= 1;
  state.score += brick.count || brick.level;
  if (axis === "x") state.ball.vx *= -1;
  else state.ball.vy *= -1;
  keepMoving(state.ball, Math.hypot(state.ball.vx, state.ball.vy));
}

function collideBricks(state, axis, time) {
  const { ball, layout } = state;
  for (const brick of state.bricks) {
    if (brick.destroyed || !brick.level) continue;
    const nx = clamp(ball.x, brick.x, brick.x + brick.w);
    const ny = clamp(ball.y, brick.y, brick.y + brick.h);
    const dx = ball.x - nx;
    const dy = ball.y - ny;
    if (dx * dx + dy * dy > layout.ballR * layout.ballR) continue;
    hitBrick(state, brick, axis, time);
    return;
  }
}

function resetBall(state) {
  const { layout, config } = state;
  const remaining = state.bricks.filter((brick) => !brick.destroyed && brick.level);
  const aim = aimVector(remaining, state.paddleX, layout, config);
  state.ball.x = state.paddleX + layout.paddleW / 2;
  state.ball.y = layout.paddleY - 16;
  state.ball.vx = aim.vx;
  state.ball.vy = aim.vy;
}

export function step(state, dt) {
  const speed = Math.hypot(state.ball.vx, state.ball.vy);
  const slices = Math.max(1, Math.ceil((speed * dt) / 3));
  const slice = dt / slices;
  for (let i = 0; i < slices; i += 1) advance(state, slice);
}

function advance(state, dt) {
  state.elapsed += dt;
  if (state.elapsed < state.config.introSeconds) {
    state.paddleX += (state.layout.width / 2 - state.layout.paddleW / 2 - state.paddleX) * 0.08;
    state.ball.x = state.paddleX + state.layout.paddleW / 2;
    state.ball.y = state.layout.paddleY - 16;
    return;
  }

  movePaddle(state, dt);
  const { ball, layout } = state;
  ball.x += ball.vx * dt;
  if (ball.x < layout.pad + layout.ballR) {
    ball.x = layout.pad + layout.ballR;
    ball.vx *= -1;
  } else if (ball.x > layout.width - layout.pad - layout.ballR) {
    ball.x = layout.width - layout.pad - layout.ballR;
    ball.vx *= -1;
  }
  collideBricks(state, "x", state.elapsed);

  ball.y += ball.vy * dt;
  if (ball.y < layout.header + layout.ballR) {
    ball.y = layout.header + layout.ballR;
    ball.vy *= -1;
  }
  collideBricks(state, "y", state.elapsed);
  bouncePaddle(state);

  if (ball.y > layout.height + 20) resetBall(state);
  if (state.loopBricks && state.live <= 0) {
    for (const brick of state.bricks) {
      brick.destroyed = false;
      brick.hitAt = null;
    }
    state.live = state.bricks.filter((brick) => brick.level).length;
  }
}

export function simulate(calendar, config = CONFIG) {
  const state = createState(calendar, config);
  state.loopBricks = false;
  const dt = 1 / config.fps;
  const total = config.introSeconds + config.gameSeconds;
  const frames = [];
  while (state.elapsed < total - dt / 2) {
    step(state, dt);
    frames.push({
      t: state.elapsed,
      paddleX: state.paddleX,
      ballX: state.ball.x,
      ballY: state.ball.y,
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
