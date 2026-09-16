#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadCalendar } from "./github/contributions.js";
import { renderExtension } from "./factory.js";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) out[key] = true;
    else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

function env(name, fallback = "") {
  return process.env[name] || fallback;
}

function assertSafeOutDir(outDir) {
  const normalized = outDir.replace(/\\/g, "/");
  if (path.isAbsolute(outDir) || normalized.startsWith("/") || normalized.includes("..")) {
    throw new Error("out_dir precisa ser um caminho relativo dentro do repositorio.");
  }
}

async function setOutput(name, value) {
  if (!process.env.GITHUB_OUTPUT) return;
  const { appendFile } = await import("node:fs/promises");
  await appendFile(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const login = args.user || env("INPUT_GITHUB_USER_NAME");
  const token = args.token || env("INPUT_GITHUB_TOKEN") || env("GITHUB_TOKEN");
  const extension = args.extension || env("INPUT_EXTENSION", "block-breaker");
  const outDir = args.out || env("INPUT_OUT_DIR", "dist");
  const source = args.source || env("INPUT_SOURCE", "user");
  const repository = args.repository || env("INPUT_REPOSITORY") || env("GITHUB_REPOSITORY");

  if (!login) {
    throw new Error("Passe --user LOGIN ou o input github_user_name da Action.");
  }
  assertSafeOutDir(outDir);

  const calendar = await loadCalendar({ login, token, source, repository });
  const rendered = renderExtension(extension, calendar);
  const dest = path.resolve(process.cwd(), outDir);
  await mkdir(dest, { recursive: true });

  const svgName = rendered.files.svg;
  const htmlName = rendered.files.html;
  await writeFile(path.join(dest, svgName), rendered.artifacts.svg, "utf8");
  await writeFile(path.join(dest, htmlName), rendered.artifacts.html, "utf8");

  const snippet = [
    `<!-- Commit Craft · ${rendered.id} -->`,
    `<p align="center">`,
    `  <a href="./${htmlName}">`,
    `    <img src="./${svgName}" alt="Block Breaker dos commits anuais de ${login}" />`,
    `  </a>`,
    `</p>`,
    ``,
    `_A pipeline joga sozinha no README. Clique na imagem para abrir o HTML e controlar com A/D ou setas._`,
    ``,
  ].join("\n");
  await writeFile(path.join(dest, "README.embed.md"), snippet, "utf8");

  await setOutput("svg_path", `${outDir}/${svgName}`.replaceAll("\\\\", "/"));
  await setOutput("html_path", `${outDir}/${htmlName}`.replaceAll("\\\\", "/"));

  const note = calendar.warning ? ` aviso=${calendar.warning}` : "";
  console.log(`Gerado ${extension} para ${calendar.login} (${calendar.total} commits, fonte=${calendar.source})${note}`);
  console.log(`SVG  ${path.join(dest, svgName)}`);
  console.log(`HTML ${path.join(dest, htmlName)}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
