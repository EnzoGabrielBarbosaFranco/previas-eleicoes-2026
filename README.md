# Prévia personalizável

Esta pasta é independente dos widgets atuais de 2022 e 2026. Ela reúne os formatos da experiência personalizável para clientes e exibe a base oficial de candidaturas de 2026 publicada pelo TSE.

## Abrir localmente

Com o servidor do frontend ativo na porta 5500:

- `http://127.0.0.1:5500/`
- `http://127.0.0.1:5500/horizontal.html`
- `http://127.0.0.1:5500/970x90.html`
- `http://127.0.0.1:5500/970x250.html`
- `http://127.0.0.1:5500/970x250x100.html`
- `http://127.0.0.1:5500/1260x100.html`
- `http://127.0.0.1:5500/1260x200.html`
- `http://127.0.0.1:5500/300x600.html`
- `http://127.0.0.1:5500/300x250.html`

Use `?view=candidatos` para abrir diretamente a área de candidatos.

## Incorporar em outro site

O modo recomendado é usar o componente criado pelo `embed.js`:

```html
<script src="https://previas-eleicoes-2026.vercel.app/embed.js" defer></script>

<previa-eleitoral-2026
  formato="1260x100"
  breakpoint="1050">
</previa-eleitoral-2026>
```

O componente limita a mudança estrutural para mobile a 760px, que é o breakpoint suportado pelos layouts internos. Assim, `breakpoint="1050"` não transforma o banner em composição de celular entre 761 e 1050px; nessa faixa ele apenas respeita o espaço disponível e mantém o desenho desktop.

As dimensões precisam estar na própria tag `<iframe>` da página que incorpora a prévia. Sem `width` e `height`, o navegador usa o tamanho padrão de 300 × 150. O conteúdo hospedado na Vercel não consegue corrigir sozinho o tamanho do iframe quando o portal está em outro domínio.

Carregue `embed.js` uma vez na página hospedeira e identifique o formato na classe do iframe. O script preserva as dimensões nominais e ajusta a altura conforme o formato e o espaço disponível.

```html
<script src="https://previas-eleicoes-2026.vercel.app/embed.js" defer></script>

<iframe
  class="previa-eleitoral previa-970x250"
  src="https://previas-eleicoes-2026.vercel.app/970x250.html"
  width="970"
  height="250"
  title="Prévia 970 por 250 das Eleições 2026"
  loading="lazy"
  scrolling="no">
</iframe>
```

Use estas dimensões diretamente nas respectivas tags:

| Classe | `width` | `height` | largura no `style` |
| --- | ---: | ---: | --- |
| `previa-index` | 1180 | 680 | `min(1180px, 100%)` |
| `previa-horizontal` | 1200 | 100 | `min(1200px, 100%)` |
| `previa-970x90` | 970 no desktop / largura disponível no mobile | 90 | `min(970px, 100%)` / `100%` |
| `previa-970x250` | 970 | 250 | `min(970px, 100%)` |
| `previa-970x250x100` | 970 | 250 no desktop / 100 no mobile | `min(970px, 100%)` |
| `previa-1260x100` | 1260 | 100 | `min(1260px, 100%)` |
| `previa-1260x200` | 1260 | 200 no desktop / 100 no mobile | `min(1260px, 100%)` |
| `previa-300x600` | 300 | 600 | `min(300px, 100%)` |
| `previa-300x250` | 300 | 250 | `min(300px, 100%)` |

Os formatos `970x250x100.html`, `1260x100.html` e `1260x200.html` mantêm a visão geral, a marca e a navegação dos demais banners. O primeiro usa 970 × 250 no desktop; os formatos de 1260 usam, respectivamente, 100px e 200px de altura. Em telas de até 760px, todos ocupam a largura disponível com 100px de altura. Na área de candidatos, o cabeçalho é removido no mobile para manter os quatro filtros e a lista acessíveis.

Para o banner 970 × 90 fluido, use `970x90.html` com a classe `previa-970x90`. Abaixo de 760px ele ocupa toda a largura disponível e mantém 90px de altura. Na área de candidatos, o cabeçalho é removido para preservar os quatro filtros, a faixa de candidatos e a navegação.

Os atributos e o estilo inline evitam o estado inicial de 300 × 150. O `embed.js` deve ser carregado no portal, fora do iframe; ele é necessário para trocar corretamente as dimensões responsivas de `previa-index`, `previa-horizontal`, `previa-970x90` e `previa-970x250x100` no mobile.

## Personalizar um cliente

Todas as opções ficam em `assets/config.js`:

- `marca.nome`: nome completo, como `Diário do Centro`;
- `marca.sigla`: sigla opcional, como `DC`; se ficar vazia, será gerada automaticamente;
- `marca.edicao`: identificador da edição, como `26`;
- `marca.regiao`: subtítulo ou área de cobertura;
- `marca.logoUrl`: endereço do logotipo; vazio usa o ícone padrão;
- `cores.primaria`, `cores.secundaria` e `cores.destaque`: as três cores da marca.

O JavaScript calcula automaticamente cores de contraste para texto. Assim, combinações claras — por exemplo amarelo, verde e branco — continuam legíveis.

Para testar uma identidade sem editar arquivos, use parâmetros na URL:

```text
/?nome=Diário&sigla=D&cor1=%23f4c400&cor2=%230b7a45&cor3=%23ffffff
```

Parâmetros disponíveis: `nome`, `sigla`, `regiao`, `logo`, `cor1`, `cor2`, `cor3` e `view`.

## Dados oficiais de candidatos

A prévia não consulta o Worker de resultados e não exibe candidatos do simulado. Ela lê arquivos JSON estáticos gerados a partir do `consulta_cand_2026.zip` oficial do TSE:

- presidente usa `data/2026/br/1.json`;
- governador, senador e deputados usam `data/2026/<uf>/<cargo>.json`;
- deputado estadual não é oferecido para o DF; nesse caso o cargo correto é deputado distrital;
- os JSONs exibem somente candidaturas sem situação final impeditiva; registros indeferidos em definitivo, renunciados, cancelados, não conhecidos ou com falecimento são excluídos;
- candidaturas pendentes de julgamento ou com recurso permanecem visíveis até uma decisão final;
- `data/2026/manifest.json` e o bloco `meta` de cada arquivo informam separadamente a data da extração cadastral e a data de verificação das situações no DivulgaCandContas;
- os filtros de partido e busca funcionam no navegador;
- se o arquivo ainda não tiver sido publicado, o widget informa que aguarda a base oficial;
- quando os ZIPs oficiais de fotos forem informados ao gerador, as imagens são incorporadas como miniaturas WebP; candidatos sem foto continuam exibindo as iniciais.

Depois de baixar `consulta_cand_2026.zip` no Portal de Dados Abertos do TSE, gere ou atualize os arquivos do front com:

```powershell
cd C:\Users\Enzo\Projetos\backend-eleicoes\candidatos-2026
py gerar_dados.py --arquivo "C:\Users\Enzo\Downloads\consulta_cand_2026.zip" --saida "C:\Users\Enzo\Projetos\previas-eleicao-2026\data"
```

Depois de aplicar as situações atuais do DivulgaCandContas, valide a consistência dos 109 arquivos antes de publicar:

```powershell
node scripts/validar-candidatos-2026.js
```

Depois, publique o front normalmente na Vercel. Os visitantes leem os arquivos pela própria CDN do site, sem fazer requisições ao TSE e sem consumir o Worker de apuração.
