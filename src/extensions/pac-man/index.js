import { resolveTheme } from "../../theme/index.js";
import { CONFIG, simulate } from "./engine.js";
import { renderSvg } from "./svg.js";
import { renderHtml } from "./html.js";

export const PAC_MAN = {
  id: "pac-man",
  title: "Pac-Man",
  files: {
    svg: "pac-man.svg",
    html: "pac-man.html",
  },
};

export function renderPacMan(calendar, options = {}) {
  const requested = options.theme;
  const theme = resolveTheme(requested || "pacman");
  const sim = simulate(calendar, CONFIG, { bugColors: theme.bugs });
  sim.theme = theme;
  return {
    svg: renderSvg(sim),
    html: renderHtml({
      calendar,
      theme,
      config: CONFIG,
    }),
  };
}
