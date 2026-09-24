# Prévia personalizável

Esta pasta é independente dos widgets atuais de 2022 e 2026. Ela reúne os cinco formatos da experiência personalizável para clientes e exibe a base oficial de candidaturas de 2026 publicada pelo TSE.

## Abrir localmente

Com o servidor do frontend ativo na porta 5500:

- `http://127.0.0.1:5500/`
- `http://127.0.0.1:5500/horizontal.html`
- `http://127.0.0.1:5500/970x250.html`
- `http://127.0.0.1:5500/300x600.html`
- `http://127.0.0.1:5500/300x250.html`

Use `?view=candidatos` para abrir diretamente a área de candidatos.

## Incorporar em outro site

As dimensões precisam estar na própria tag `<iframe>` da página que incorpora a prévia. Sem `width` e `height`, o navegador usa o tamanho padrão de 300 × 150. O conteúdo hospedado na Vercel não consegue corrigir sozinho o tamanho do iframe quando o portal está em outro domínio.

Carregue `embed.js` uma vez na página hospedeira e identifique o formato na classe do iframe. O script preserva as dimensões nominais, protege o iframe do CSS geral do portal e ajusta a altura dos formatos largos quando o espaço disponível tiver até 760 px.

```html
<script src="https://previas-eleicoes-2026.vercel.app/embed.js" defer></script>

<iframe
  class="previa-eleitoral previa-970x250"
  src="https://previas-eleicoes-2026.vercel.app/970x250.html"
  width="970"
  height="250"
  style="display:block;width:min(970px, 100%) !important;height:250px !important;margin-inline:auto;border:0;"
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
| `previa-970x250` | 970 | 250 | `min(970px, 100%)` |
| `previa-300x600` | 300 | 600 | `min(300px, 100%)` |
| `previa-300x250` | 300 | 250 | `min(300px, 100%)` |

Os atributos e o estilo inline evitam o estado inicial de 300 × 150. O `embed.js` deve ser carregado no portal, fora do iframe; ele é necessário para trocar corretamente a altura de `previa-index` e `previa-horizontal` no mobile.

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
- os filtros de partido e busca funcionam no navegador;
- se o arquivo ainda não tiver sido publicado, o widget informa que aguarda a base oficial;
- quando os ZIPs oficiais de fotos forem informados ao gerador, as imagens são incorporadas como miniaturas WebP; candidatos sem foto continuam exibindo as iniciais.

Depois de baixar `consulta_cand_2026.zip` no Portal de Dados Abertos do TSE, gere ou atualize os arquivos do front com:

```powershell
cd C:\Users\Enzo\Projetos\backend-eleicoes\candidatos-2026
py gerar_dados.py --arquivo "C:\Users\Enzo\Downloads\consulta_cand_2026.zip" --saida "C:\Users\Enzo\Projetos\previas-eleicao-2026\data"
```

Depois, publique o front normalmente na Vercel. Os visitantes leem os arquivos pela própria CDN do site, sem fazer requisições ao TSE e sem consumir o Worker de apuração.
