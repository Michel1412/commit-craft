import { renderBlockBreaker, BLOCK_BREAKER } from "./extensions/block-breaker/index.js";

export const EXTENSIONS = {
  [BLOCK_BREAKER.id]: {
    ...BLOCK_BREAKER,
    render: renderBlockBreaker,
  },
};

export function renderExtension(id, calendar) {
  const extension = EXTENSIONS[id];
  if (!extension) {
    const known = Object.keys(EXTENSIONS).join(", ");
    throw new Error(`Extensao desconhecida: ${id}. Disponiveis: ${known}`);
  }
  return {
    id: extension.id,
    files: extension.files,
    artifacts: extension.render(calendar),
  };
}
