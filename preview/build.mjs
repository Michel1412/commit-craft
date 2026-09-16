import { mkdir, writeFile } from "node:fs/promises";
import { loadCalendar } from "../src/github/contributions.js";
import { renderExtension } from "../src/factory.js";
import { THEMES } from "../src/theme/index.js";

const calendar = await loadCalendar({
  login: "Michel1412",
  token: process.env.GITHUB_TOKEN || process.env.GH_TOKEN,
  source: "user",
});

await mkdir(new URL(".", import.meta.url), { recursive: true });

const themes = Object.values(THEMES);
for (const theme of themes) {
  const rendered = renderExtension("block-breaker", calendar, { theme: theme.id });
  await writeFile(new URL(`./${theme.id}.html`, import.meta.url), rendered.artifacts.html);
  await writeFile(new URL(`./${theme.id}.svg`, import.meta.url), rendered.artifacts.svg);
  console.log(theme.id);
}

const cards = themes
  .map(
    (theme) => `<a class="card" href="./${theme.id}.html" target="_blank" rel="noreferrer">
  <img src="./${theme.id}.svg" alt="Block Breaker tema ${theme.name}"/>
  <div>
    <strong>${theme.name}</strong>
    <span>${theme.group} · ${theme.id}</span>
  </div>
</a>`,
  )
  .join("\n");

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
    p { color: #a1a1aa; margin: 0 0 20px; font-size: 13px; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
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
  <h1>Temas do Block Breaker</h1>
  <p>Clique em um card para jogar aquele tema. Sem foco o automatico roda; clique no palco para controlar.</p>
  <div class="grid">
${cards}
  </div>
</body>
</html>
`;

await writeFile(new URL("./index.html", import.meta.url), index);
console.log("index");
