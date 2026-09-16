import { mkdir, writeFile } from "node:fs/promises";
import { loadCalendar } from "../src/github/contributions.js";
import { listExtensions, renderExtension } from "../src/factory.js";
import { THEMES } from "../src/theme/index.js";

const calendar = await loadCalendar({
  login: "Michel1412",
  token: process.env.GITHUB_TOKEN || process.env.GH_TOKEN,
  source: "user",
});

await mkdir(new URL(".", import.meta.url), { recursive: true });
await mkdir(new URL("./pac-man", import.meta.url), { recursive: true });

const themes = Object.values(THEMES);
const games = listExtensions();

for (const theme of themes) {
  const block = renderExtension("block-breaker", calendar, { theme: theme.id });
  await writeFile(new URL(`./${theme.id}.html`, import.meta.url), block.artifacts.html);
  await writeFile(new URL(`./${theme.id}.svg`, import.meta.url), block.artifacts.svg);
  const pac = renderExtension("pac-man", calendar, { theme: theme.id });
  await writeFile(new URL(`./pac-man/${theme.id}.html`, import.meta.url), pac.artifacts.html);
  await writeFile(new URL(`./pac-man/${theme.id}.svg`, import.meta.url), pac.artifacts.svg);
  console.log(theme.id);
}

function cards(game, prefix) {
  return themes
    .map(
      (theme) => `<a class="card" href="${prefix}${theme.id}.html" target="_blank" rel="noreferrer">
  <img src="${prefix}${theme.id}.svg" alt="${game} tema ${theme.name}"/>
  <div>
    <strong>${theme.name}</strong>
    <span>${theme.group} · ${theme.id}${theme.id === "pacman" && game === "Pac-Man" ? " · oficial" : ""}</span>
  </div>
</a>`,
    )
    .join("\n");
}

const index = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Commit Breaker · temas</title>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0;
      padding: 24px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      background: #09090b;
      color: #fafafa;
    }
    h1 { font-size: 18px; font-weight: 600; margin: 0 0 8px; }
    h2 { font-size: 15px; margin: 28px 0 8px; }
    p { color: #a1a1aa; margin: 0 0 20px; font-size: 13px; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 16px;
    }
    .card {
      display: grid;
      gap: 10px;
      padding: 12px;
      border: 1px solid #27272a;
      border-radius: 12px;
      background: #18181b;
      color: inherit;
      text-decoration: none;
    }
    .card img { width: 100%; height: auto; border-radius: 8px; background: #000; }
    .card div { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; }
    .card span { color: #a1a1aa; }
  </style>
</head>
<body>
  <h1>Commit Breaker</h1>
  <p>Dois jogos, os mesmos temas. Sem foco o automatico roda; clique no palco para controlar. Jogos: ${games.join(", ")}.</p>
  <h2>Block Breaker</h2>
  <div class="grid">
${cards("Block Breaker", "./")}
  </div>
  <h2>Pac-Man</h2>
  <p>O calendario e o mapa. Pac-Man anda nos dias vazios e come os commits. 4 Bugs, 5 vidas, 10 dias especiais. Tema oficial: pacman.</p>
  <div class="grid">
${cards("Pac-Man", "./pac-man/")}
  </div>
</body>
</html>
`;

await writeFile(new URL("./index.html", import.meta.url), index);
console.log("index");
