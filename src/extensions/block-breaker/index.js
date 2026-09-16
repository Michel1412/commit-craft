import { END_THEME } from "../../theme/end.js";
import { SPRITES } from "../../sprites.js";
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

export function renderBlockBreaker(calendar) {
  const sim = simulate(calendar);
  sim.theme = END_THEME;
  sim.sprites = SPRITES;
  return {
    svg: renderSvg(sim),
    html: renderHtml({
      calendar,
      theme: END_THEME,
      sprites: SPRITES,
      config: CONFIG,
    }),
  };
}
