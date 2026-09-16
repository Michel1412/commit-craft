const MINER_PALETTE = {
  h: "#2b1a12",
  s: "#e0ac7a",
  e: "#f8f4ea",
  p: "#2a1810",
  m: "#c47a58",
  c: "#3b8ea5",
  d: "#2a6a7c",
  b: "#3d4c99",
  n: "#2a3470",
  o: "#4a3728",
  a: "#d49a6a",
};

const MINER_ROWS = [
  "....hhhhhhhh....",
  "...hhhhhhhhhh...",
  "...hhsssssshh...",
  "...hssssssssh...",
  "...hseppesseh...",
  "...hssssssssh...",
  "...hssmmsessh...",
  "....ssssssss....",
  "......cccc......",
  "....aaccccaa....",
  "...aaacccccaaa..",
  "...aaadccccdaa..",
  "...aaa.cc.c.aa..",
  "....aa....aa....",
  "......bbbb......",
  "......bnnb......",
  "......n..n......",
  "......n..n......",
  "......o..o......",
  "......o..o......",
];

const DRAGON_PALETTE = {
  k: "#12081c",
  p: "#3b0764",
  h: "#6b21a8",
  g: "#a855f7",
  e: "#d9f99d",
  m: "#f0abfc",
  w: "#2e1065",
  t: "#1e1b4b",
};

const DRAGON_ROWS = [
  "....gg................w.w.............",
  "...ghhg..........wwwwwwwww............",
  "..ghkkhg.......wwwwhhhhwwwww..........",
  ".ghkppkhg.....wwwhhppphhwwwww.........",
  "ghkpmephg....wwhhppggpphhwwww.........",
  "hkppmmph....whhpggggggpphwww..........",
  ".hpppphg...whhpgpppppgpphw............",
  "..hkkhg....hhpgppkkppgpph.............",
  "...hh.....hhpgppkkkkppgpph...ttt......",
  "...........hpgppkkkkppgph..ttppp......",
  "............hppgppppgpph.ttppph.......",
  ".............hhppggpphh.tppph.........",
  "..............wwwhhhwww.tph...........",
  ".............www.....www.t............",
  "............ww.........ww.............",
];

const PIPELINE_PALETTE = {
  o: "#1b1526",
  h: "#3f3354",
  c: "#22d3ee",
  g: "#a5f3fc",
  d: "#0e7490",
};

const PIPELINE_ROWS = [
  "..hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh..",
  ".hooooooooooooooooooooooooooooooooooooooooh.",
  "hhooocccdooocccdooocccdooocccdooocccdooooohh",
  "hhooogggdoooggdgoooggdgoooggdgooogggdooooohh",
  ".hooooooooooooooooooooooooooooooooooooooooh.",
  "..hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh..",
];

function compile(rows, palette) {
  const width = Math.max(...rows.map((row) => row.length));
  const rects = [];
  for (let y = 0; y < rows.length; y += 1) {
    const row = rows[y].padEnd(width, ".");
    let x = 0;
    while (x < width) {
      const ch = row[x];
      const fill = palette[ch];
      if (!fill) {
        x += 1;
        continue;
      }
      let w = 1;
      while (x + w < width && row[x + w] === ch) w += 1;
      rects.push({ x, y, w, h: 1, fill });
      x += w;
    }
  }
  return { width, height: rows.length, rects, rows, palette };
}

export const SPRITES = {
  miner: compile(MINER_ROWS, MINER_PALETTE),
  dragon: compile(DRAGON_ROWS, DRAGON_PALETTE),
  pipeline: compile(PIPELINE_ROWS, PIPELINE_PALETTE),
};

export function spriteSvg(sprite, x, y, scale) {
  return sprite.rects
    .map(
      (rect) =>
        `<rect x="${x + rect.x * scale}" y="${y + rect.y * scale}" width="${rect.w * scale}" height="${rect.h * scale}" fill="${rect.fill}"/>`,
    )
    .join("");
}
