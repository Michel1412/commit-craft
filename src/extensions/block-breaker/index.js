import { resolveTheme } from "../../theme/index.js";
import { CONFIG, simulate } from "./engine.js";
import { renderSvg } from "./svg.js";
import { renderHtml } from "./html.js";

export const BLOCK_BREAKER = {
  id: "block-breaker",
  title: "Block Breaker",
  files: {
    svg: "block-breaker.svg",
    html: "block-breaker.html",
  },
};

export function renderBlockBreaker(calendar, options = {}) {
  const theme = resolveTheme(options.theme);
  const sim = simulate(calendar);
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
