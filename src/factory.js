import { renderBlockBreaker, BLOCK_BREAKER } from "./extensions/block-breaker/index.js";
import { renderPacMan, PAC_MAN } from "./extensions/pac-man/index.js";

export const EXTENSIONS = {
  [BLOCK_BREAKER.id]: {
    ...BLOCK_BREAKER,
    render: renderBlockBreaker,
  },
  [PAC_MAN.id]: {
    ...PAC_MAN,
    render: renderPacMan,
  },
};

export function listExtensions() {
  return Object.keys(EXTENSIONS);
}

export function renderExtension(id, calendar, options = {}) {
  const extension = EXTENSIONS[id];
  if (!extension) {
    const known = listExtensions().join(", ");
    throw new Error(`Extensao desconhecida: ${id}. Disponiveis: ${known}`);
  }
  return {
    id: extension.id,
    files: extension.files,
    artifacts: extension.render(calendar, options),
  };
}
