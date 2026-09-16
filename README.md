<p align="center">
  <a href="./dist/block-breaker.html">
    <img src="./dist/block-breaker.svg" alt="Block Breaker dos commits anuais: Steve entra no The End, o dragao lanca o bafo e o calendario vira o jogo">
  </a>
</p>

<p align="center">
  <strong>Commit Craft</strong> — fabrica de extensoes GitHub Actions.<br/>
  Primeira peca: o <em>Block Breaker</em> dos commits do ultimo ano, para colar em qualquer README.
</p>

# Commit Craft

Uma Action reutilizavel que pega a quantidade de contribuicoes do **ultimo ano no GitHub inteiro** (nao so de um repo) e transforma isso em um jogo no estilo The End.

A pixel art e original, inspirada na ilha do End. Nao e asset oficial do Minecraft e o projeto nao tem ligacao com Mojang ou Microsoft.

## O que o README consegue (e o que nao consegue)

O GitHub **nao executa JavaScript** dentro de um `README.md`. Por isso esta fabrica gera **dois arquivos**:

| Arquivo | Onde aparece | O que faz |
| --- | --- | --- |
| `dist/block-breaker.svg` | No README | Intro + pipeline jogando **sozinha** (animacao SMIL) |
| `dist/block-breaker.html` | Clique na imagem, ou GitHub Pages | O mesmo jogo. **Clique para focar** e use **A/D** ou **← →** |

Isso e o padrao das Actions conhecidas (`Platane/snk`, graficos Pac-Man/Breakout de contribuicoes): o README e um filme; o HTML e o fliperama.

## A cena

1. O minerador entra na ilha do End.
2. O dragao faz um voo razante.
3. O bafo cobre a sprite inteira.
4. O bafo sobe devagar e vira o diagrama: cada tijolo e um dia do ultimo ano com commits.
5. A **pipeline** (a barra de baixo) joga sozinha e quebra esses tijolos.

Quanto mais commits naquele dia, mais claro o tijolo. Dias sem commit ficam como obsidiana escura, para o calendario do ano inteiro virar a parede.

## Passos pequenos para colocar no seu README

### 1. Crie o workflow

No repositorio onde vive o README (perfil `seu-user/seu-user` ou qualquer outro), copie [`examples/add-to-your-repo.yml`](./examples/add-to-your-repo.yml) para:

```
.github/workflows/commit-craft.yml
```

O arquivo ja chama esta Action e grava `dist/block-breaker.svg` e `dist/block-breaker.html`.

### 2. Rode uma vez na mao

GitHub → aba **Actions** → workflow **commit-craft** → **Run workflow**.

Depois do verde, a pasta `dist/` aparece no repositorio.

### 3. Cole isto no README.md

```markdown
<p align="center">
  <a href="./dist/block-breaker.html">
    <img src="./dist/block-breaker.svg" alt="Block Breaker dos commits anuais" />
  </a>
</p>
```

O SVG ja anima no README. O clique abre o HTML.

### 4. (Opcional) Deixar o teclado publico

No GitHub, o clique em um `.html` abre o **codigo**, nao o jogo. Para jogar no navegador:

1. Settings → Pages
2. Source: **Deploy from a branch**
3. Branch: `main`, pasta: `/dist`

O jogo fica em `https://SEU-USER.github.io/SEU-REPO/block-breaker.html`. Troque o `href` do passo 3 por esse endereco.

### 5. Jogar com teclado

Abra o HTML → clique no palco (borda ciano = foco) → **A/D** ou **setas**. Sem foco, a pipeline volta a jogar sozinha.

## Action

```yaml
- uses: Michel1412/commit-craft@v1
  with:
    github_user_name: ${{ github.repository_owner }}
    github_token: ${{ secrets.GITHUB_TOKEN }}
    extension: block-breaker
    out_dir: dist
```

| Input | Padrao | Significado |
| --- | --- | --- |
| `github_user_name` | obrigatorio | Login cujo calendario anual vira tijolo |
| `github_token` | `github.token` | Le o calendario. Publico basta. PAT `read:user` inclui privados |
| `extension` | `block-breaker` | Peca da fabrica |
| `out_dir` | `dist` | Pasta relativa de saida |
| `source` | `user` | `user` = GitHub inteiro no ultimo ano. `repo` = commits das 52 semanas de um repositorio |
| `repository` | o repo da Action | Usado quando `source=repo` |

## Rodar na sua maquina

```bash
node src/cli.js --user SEU_LOGIN --token SEU_TOKEN --out dist
```

Sem token, a fabrica gera um calendario sintetico so para voce ver a cena.

O workflow que regenera o `dist/` desta fabrica esta em [`examples/self-generate.yml`](./examples/self-generate.yml). Copie para `.github/workflows/generate.yml` se quiser que o GitHub atualize o SVG sozinho.

## Por que estes dados

O GitHub GraphQL `contributionCalendar` e o mesmo mapa verde do perfil: **todos os commits/contribuicoes publicas do ultimo ano**, em qualquer repositorio. E o “GitHub como um todo” daquela pessoa.

`source: repo` usa a API de `commit_activity` quando voce quer so um projeto.

Ideias da mesma familia (e linhas futuras desta fabrica): snake do calendario, Pac-Man, Galaga, Game of Life, cometa cinematico. A peca de agora e o Block Breaker no The End.

## Licenca

MIT. Pixel art original.
