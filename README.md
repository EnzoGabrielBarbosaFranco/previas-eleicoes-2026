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
- `http://127.0.0.1:5500/320x100.html`
- `http://127.0.0.1:5500/300x600.html`
- `http://127.0.0.1:5500/300x250.html`

Use `?view=candidatos` para abrir diretamente a área de candidatos.

## Incorporar em outro site

Para sites que não usam Ad Manager, mantenha o `embed.js` quando precisar alternar automaticamente a altura desktop/mobile:

```html
<script src="https://previa.paineleleitoralnews.com.br/embed.js"></script>
<previa-eleitoral-2026 formato="1260x200" breakpoint="1050"></previa-eleitoral-2026>
```

Esse formato mantém 200px de altura no desktop e 100px no mobile, conforme o breakpoint informado. O script usa a própria URL para localizar os HTMLs. Mantendo o domínio próprio, a troca entre Vercel e Cloudflare não exige mudar esse código.

Para um iframe direto de altura fixa, também é possível incorporar o HTML sem carregar `embed.js` nem registrar Web Components:

```html
<iframe
  src="https://previa.paineleleitoralnews.com.br/1260x100.html"
  width="1260"
  height="100"
  title="Prévia das Eleições 2026"
  scrolling="no"
  style="display:block;width:100%;max-width:1260px;height:100px;margin:0 auto;border:0;overflow:hidden">
</iframe>
```

O iframe entrega a largura real do slot para a página hospedada. Com isso, os media queries de `assets/previa.css` continuam alternando automaticamente entre os desenhos desktop e mobile.

As dimensões precisam estar na própria tag `<iframe>`. Sem `width` e `height`, o navegador usa o tamanho padrão de 300 × 150. O conteúdo hospedado não consegue alterar sozinho a altura do iframe do Ad Manager porque ele está em outro contexto e, normalmente, dentro de um SafeFrame.

No Ad Manager, cadastre o tamanho desktop contratado e o único tamanho mobile padronizado:

- desktop: o tamanho nominal do formato escolhido;
- mobile: sempre 320 × 100, carregando `320x100.html`.

Para o Google Ad Manager, use os códigos que preenchem 100% dos criativos em [ADMANAGER.md](./ADMANAGER.md). O desktop usa o arquivo do formato contratado e o mobile sempre usa `320x100.html`. Os arquivos prontos para copiar ficam em [`entrega-admanager`](./entrega-admanager/LEIA-ME.txt).

O arquivo `embed.js` continua disponível para integrações fora do Ad Manager. Nenhum dos HTMLs de formato depende dele. No Ad Manager, use somente os snippets de iframe da entrega, com o tamanho externo cadastrado na plataforma.

Cadastre estes tamanhos externos no Ad Manager:

| Arquivo | slot desktop | slot mobile |
| --- | ---: | ---: |
| `index.html` | 1180 × 680 | `320x100.html`, 320 × 100 |
| `horizontal.html` | 1200 × 100 | `320x100.html`, 320 × 100 |
| `970x90.html` | 970 × 90 | `320x100.html`, 320 × 100 |
| `970x250.html` | 970 × 250 | `320x100.html`, 320 × 100 |
| `970x250x100.html` | 970 × 250 | `320x100.html`, 320 × 100 |
| `1260x100.html` | 1260 × 100 | `320x100.html`, 320 × 100 |
| `1260x200.html` | 1260 × 200 | `320x100.html`, 320 × 100 |
| `320x100.html` | — | 320 × 100 |
| `300x600.html` | 300 × 600 | 300 × 600 |
| `300x250.html` | 300 × 250 | 300 × 250 |

Os formatos `970x250x100.html`, `1260x100.html` e `1260x200.html` mantêm a visão geral, a marca e a navegação dos demais banners. O primeiro usa 970 × 250 no desktop; os formatos de 1260 usam, respectivamente, 100px e 200px de altura. Na área de candidatos, o cabeçalho é removido no mobile para manter os quatro filtros e a lista acessíveis.

Para entregas via Ad Manager, `320x100.html` é o único criativo mobile e acompanha todos os formatos desktop. Não devem ser cadastradas outras larguras mobile para essa entrega.

Para o banner 970 × 90 fluido, use `970x90.html` com a classe `previa-970x90`. Abaixo de 760px ele ocupa toda a largura disponível e mantém 90px de altura. Na área de candidatos, o cabeçalho é removido para preservar os quatro filtros, a faixa de candidatos e a navegação.

Os atributos e o estilo inline evitam o estado inicial de 300 × 150. No Ad Manager, a altura externa é definida pelo tamanho do slot; o layout interno responde automaticamente à largura recebida.

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

Os visitantes leem os arquivos pela própria CDN do site, sem fazer requisições ao TSE e sem consumir o Worker de apuração. A publicação externa depende de autorização explícita.

## Cloudflare Pages e cache

A versão estática para Cloudflare Pages é gerada com `node scripts/preparar-pages.js`, na pasta `dist-pages/`. Ela mantém os formatos e os caminhos existentes, reúne scripts/estilos e gera nomes versionados para aproveitar o cache do navegador sem congelar futuras atualizações.

Execute `node scripts/testar-pages.js` para testar o build e os banners localmente com Chrome/Edge. Execute `node scripts/testar-pages.js --fonte` para testar os arquivos-fonte e as regras de cache de `vercel.json`, sem empacotamento e sem simular os redirecionamentos do Pages. Nos dois modos, os snippets de entrega também são validados. Esses testes não publicam nada.

A Vercel continua compatível com os arquivos-fonte. O projeto de teste Cloudflare usa Direct Upload, sem integração Git; um push no repositório não o atualiza automaticamente. Se houver deploy automático do Git na Vercel, um push poderá publicar alterações lá.

Veja [CLOUDFLARE-PAGES.md](./CLOUDFLARE-PAGES.md) para o diagnóstico, a sequência de migração, as diferenças entre domínio próprio e endereço `vercel.app` e a validação necessária antes de alterar o DNS. Nada é publicado pelos scripts locais.
