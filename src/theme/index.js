/**
 * Temas disponiveis (altere THEME ou o input `theme` da Action):
 *
 * Basicos:
 *   roxo (default)
 *   cinza
 *   branco
 *   azul
 *   vermelho
 *   rosa
 *   ciano
 *   verde
 *
 * Games:
 *   minecraft
 *   pacman (oficial do Pac-Man)
 */
export const THEME = "roxo";

function pack(partial) {
  const levels = partial.levels || [];
  return {
    skin: "arcade",
    group: "basicos",
    dropMulti: "#fbbf24",
    dropWide: "#34d399",
    ball: "#ffffff",
    page: partial.background,
    lifeEmpty: "#3f3f46",
    maze: partial.frame,
    player: partial.paddleEdge,
    pellet: partial.hudMuted,
    power: partial.dropMulti || "#fbbf24",
    bugs: [levels[4], levels[3], levels[2], levels[1]].filter(Boolean),
    scared: "#1d4ed8",
    scaredFlash: "#f8fafc",
    ...partial,
  };
}

export const THEMES = {
  roxo: pack({
    id: "roxo",
    name: "Roxo",
    background: "#07070f",
    court: "#101018",
    frame: "#2a163f",
    paddle: "#f4f0ff",
    paddleEdge: "#c4b5fd",
    ballGlow: "#e9d5ff",
    hud: "#f5f3ff",
    hudMuted: "#a78bfa",
    life: "#f0abfc",
    levels: ["#120818", "#4c1d6b", "#6d28d9", "#9333ea", "#d8b4fe"],
    brickHi: "#f5d0fe",
    brickLo: "#3b0764",
  }),
  cinza: pack({
    id: "cinza",
    name: "Cinza",
    background: "#0b0b0d",
    court: "#16161a",
    frame: "#3f3f46",
    paddle: "#f4f4f5",
    paddleEdge: "#a1a1aa",
    ballGlow: "#d4d4d8",
    hud: "#fafafa",
    hudMuted: "#a1a1aa",
    life: "#e4e4e7",
    levels: ["#18181b", "#3f3f46", "#71717a", "#a1a1aa", "#e4e4e7"],
    brickHi: "#fafafa",
    brickLo: "#27272a",
  }),
  branco: pack({
    id: "branco",
    name: "Branco",
    background: "#f4f4f5",
    court: "#ffffff",
    frame: "#d4d4d8",
    paddle: "#18181b",
    paddleEdge: "#52525b",
    ball: "#27272a",
    ballGlow: "#71717a",
    hud: "#18181b",
    hudMuted: "#71717a",
    life: "#e11d48",
    lifeEmpty: "#d4d4d8",
    page: "#f4f4f5",
    levels: ["#e4e4e7", "#a1a1aa", "#71717a", "#52525b", "#27272a"],
    brickHi: "#ffffff",
    brickLo: "#a1a1aa",
  }),
  azul: pack({
    id: "azul",
    name: "Azul",
    background: "#070b14",
    court: "#0b1220",
    frame: "#1e3a5f",
    paddle: "#dbeafe",
    paddleEdge: "#60a5fa",
    ballGlow: "#93c5fd",
    hud: "#eff6ff",
    hudMuted: "#7dd3fc",
    life: "#38bdf8",
    levels: ["#0b1b33", "#1d4ed8", "#2563eb", "#3b82f6", "#93c5fd"],
    brickHi: "#dbeafe",
    brickLo: "#1e3a8a",
  }),
  vermelho: pack({
    id: "vermelho",
    name: "Vermelho",
    background: "#140808",
    court: "#1c0d0d",
    frame: "#7f1d1d",
    paddle: "#fee2e2",
    paddleEdge: "#f87171",
    ballGlow: "#fca5a5",
    hud: "#fff1f2",
    hudMuted: "#fca5a5",
    life: "#ef4444",
    levels: ["#2a0f0f", "#9f1239", "#e11d48", "#f43f5e", "#fda4af"],
    brickHi: "#fecdd3",
    brickLo: "#7f1d1d",
  }),
  rosa: pack({
    id: "rosa",
    name: "Rosa",
    background: "#14010e",
    court: "#1f0a18",
    frame: "#9d174d",
    paddle: "#fce7f3",
    paddleEdge: "#f9a8d4",
    ballGlow: "#fbcfe8",
    hud: "#fdf2f8",
    hudMuted: "#f9a8d4",
    life: "#ec4899",
    levels: ["#2a0818", "#9d174d", "#db2777", "#ec4899", "#f9a8d4"],
    brickHi: "#fce7f3",
    brickLo: "#831843",
  }),
  ciano: pack({
    id: "ciano",
    name: "Ciano",
    background: "#041016",
    court: "#082026",
    frame: "#155e75",
    paddle: "#cffafe",
    paddleEdge: "#22d3ee",
    ballGlow: "#67e8f9",
    hud: "#ecfeff",
    hudMuted: "#67e8f9",
    life: "#22d3ee",
    levels: ["#083344", "#0e7490", "#06b6d4", "#22d3ee", "#a5f3fc"],
    brickHi: "#cffafe",
    brickLo: "#155e75",
  }),
  verde: pack({
    id: "verde",
    name: "Verde",
    background: "#06140c",
    court: "#0b1f14",
    frame: "#166534",
    paddle: "#dcfce7",
    paddleEdge: "#4ade80",
    ballGlow: "#86efac",
    hud: "#f0fdf4",
    hudMuted: "#86efac",
    life: "#22c55e",
    levels: ["#052e16", "#15803d", "#16a34a", "#22c55e", "#86efac"],
    brickHi: "#dcfce7",
    brickLo: "#14532d",
  }),
  minecraft: pack({
    id: "minecraft",
    name: "Minecraft",
    group: "games",
    skin: "minecraft",
    background: "#0b1220",
    court: "#152318",
    frame: "#5c4033",
    paddle: "#8b5a2b",
    paddleEdge: "#5d9c3f",
    ball: "#f4f8ff",
    ballGlow: "#7dffb3",
    hud: "#e8f5e9",
    hudMuted: "#a3c9a8",
    life: "#e53935",
    dropMulti: "#f4c430",
    dropWide: "#5d9c3f",
    levels: ["#2a1c12", "#6b4f2a", "#8b8b8b", "#5d9c3f", "#3aa3c2"],
    brickHi: "#c4a574",
    brickLo: "#3e2a14",
  }),
  pacman: pack({
    id: "pacman",
    name: "Pac-Man",
    group: "games",
    skin: "pacman",
    background: "#000000",
    court: "#000000",
    frame: "#2121de",
    maze: "#2121de",
    paddle: "#ffff00",
    paddleEdge: "#ffff00",
    ball: "#ffff00",
    ballGlow: "#ffff88",
    player: "#ffff00",
    pellet: "#ffb8ae",
    power: "#ffffff",
    hud: "#ffffff",
    hudMuted: "#ffb8ae",
    life: "#ffff00",
    dropMulti: "#ffb8ae",
    dropWide: "#00ffff",
    bugs: ["#ff0000", "#ffb8ff", "#00ffff", "#ffb852"],
    scared: "#2121de",
    scaredFlash: "#ffffff",
    levels: ["#000000", "#2121de", "#ffb852", "#ff0000", "#ffff00"],
    brickHi: "#ffff00",
    brickLo: "#2121de",
  }),
};

const ALIASES = {
  purple: "roxo",
  gray: "cinza",
  grey: "cinza",
  white: "branco",
  blue: "azul",
  red: "vermelho",
  pink: "rosa",
  cyan: "ciano",
  green: "verde",
  "pac-man": "pacman",
  default: "roxo",
};

export function listThemes() {
  return Object.values(THEMES).map((theme) => `${theme.id} (${theme.group})`);
}

export function resolveTheme(name) {
  const key = String(name || THEME)
    .trim()
    .toLowerCase();
  const id = THEMES[key] ? key : ALIASES[key] || THEME;
  return THEMES[id] || THEMES.roxo;
}
