# Changelog

Todas as mudancas notaveis deste projeto ficam neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e as versoes seguem o [Versionamento Semantico](https://semver.org/lang/pt-BR/) no padrao **v2.0.0**.

A Action no GitHub usa a linha maior `@v2` (`uses: Michel1412/commit-craft@v2`).

## [Unreleased]

## [2.0.0] - 2026-09-16

### Added

- Novo jogo **Pac-Man** no molde do calendario GitHub: anda nos dias vazios, come os dias com commit, foge de Bugs-inseto
- 5 vidas; ao perder, Pac e Bugs resetam e os blocos ja comidos continuam
- 4 Bugs com alvos diferentes (perseguicao, emboscada, flanco e recuo); cada round limpo pode adicionar mais um (ate 8)
- Os 10 dias com mais commits sao especiais: 5s comendo Bugs, autoplay persegue, Bugs voltam em 10s
- Tema oficial `pacman`, compartilhado com o Block Breaker junto dos outros temas
- Extensao `pac-man` na Action e no CLI (`--extension pac-man`)
- README, Action e exemplos publicam os dois jogos: Block Breaker e Pac-Man, com galeria de temas para cada um

## [1.1.0] - 2026-09-16

### Added

- Nove temas selecionaveis: `roxo` (default), `cinza`, `branco`, `azul`, `vermelho`, `rosa`, `ciano`, `verde` e `minecraft`
- Input `theme` na Action e flag `--theme` no CLI
- Constante `THEME` em `src/theme/index.js`, com a lista de temas no comentario
- Galeria de previews em `preview/` e no README
- Blocos prontos para copiar o workflow e o Markdown do README
- Convite publico para outros devs abrirem PRs de temas novos

### Changed

- Nome do projeto de Commit Craft para **Commit Breaker**
- HTML, SVG e pagina do jogo passam a usar a paleta do tema escolhido

## [1.0.0] - 2026-09-15

Primeiro lancamento publico.

### Added

- Action composta que pega as contribuicoes do ultimo ano no GitHub inteiro e vira um Block Breaker
- `dist/block-breaker.svg` autoplay para o README (GitHub nao executa JavaScript)
- `dist/block-breaker.html` jogavel: clique para controlar, A/D ou setas, blur volta o automatico
- Motor com 3 vidas, saque imediato, multi-bola e plataforma larga
- Bonus nos tijolos de mais commits (bola extra ou paddle largo)
- Autoplay que joga para ganhar e evita ficar preso no eixo vertical
- CLI `node src/cli.js --user LOGIN --out dist`
- Exemplos de workflow em `examples/add-to-your-repo.yml` e `examples/self-generate.yml`
- Licenca MIT

### Changed

- Workflow de regeneracao desta fabrica foi para `examples/`, porque o token OAuth local nao tinha scope `workflow`

[Unreleased]: https://github.com/Michel1412/commit-craft/compare/v2...HEAD
[2.0.0]: https://github.com/Michel1412/commit-craft/compare/v1...v2.0.0
[1.1.0]: https://github.com/Michel1412/commit-craft/compare/v1...main
[1.0.0]: https://github.com/Michel1412/commit-craft/releases/tag/v1
