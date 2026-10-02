# Incorporação no Google Ad Manager

Os arquivos prontos para envio ficam na pasta `entrega-admanager`. Ela contém um `.txt` por formato e instruções de cadastro. Para clientes que não usam o Ad Manager, mantenha normalmente a integração com `embed.js`.

## Hospedagem e códigos existentes

Os snippets usam `https://previa.paineleleitoralnews.com.br`. Se esse domínio for mantido na migração de hospedagem, o cliente não precisará alterar os códigos de iframe ou de embed que já usam esse endereço. A mudança de DNS é uma etapa separada e depende de autorização.

`https://previas-eleicao-2026.pages.dev` é o endereço de teste. Para testar um criativo separado, substitua apenas o domínio do `src` no snippet copiado; mantenha o caminho, as dimensões e o estilo. Não substitua os criativos em uso antes da aprovação. Os arquivos de entrega continuam com o domínio próprio, não com o endereço de teste.

O teste automatizado verifica iframes entre origens diferentes, mas não substitui a validação em um criativo real do Ad Manager/SafeFrame. Verifique visão geral, candidatos, quatro filtros, links e preenchimento completo do slot. A altura de um contêiner externo de 110px não vira 100px por trocar de hospedagem: margens e fundos fora do iframe pertencem ao portal ou ao slot.

## O que o cliente copia

Para o formato 1260 × 200 no desktop, use:

```html
<iframe
  src="https://previa.paineleleitoralnews.com.br/1260x200.html"
  width="1260"
  height="200"
  title="Prévia das Eleições 2026"
  scrolling="no"
  style="position:absolute;inset:0;display:block;width:100%;height:100%;margin:0;border:0;overflow:hidden">
</iframe>
```

Para o único criativo mobile, sempre em 320 × 100, use o banner dedicado:

```html
<iframe
  src="https://previa.paineleleitoralnews.com.br/320x100.html"
  width="320"
  height="100"
  title="Prévia mobile das Eleições 2026"
  scrolling="no"
  style="position:absolute;inset:0;display:block;width:100%;height:100%;margin:0;border:0;overflow:hidden">
</iframe>
```

Os códigos não contêm `embed.js`, Web Component, media query, JavaScript nem seletores CSS globais. A estilização inline afeta somente o próprio iframe, que ocupa 100% do espaço disponibilizado pelo Ad Manager:

- em um criativo 1260 × 200, o iframe será 1260 × 200 e mostrará o desenho desktop;
- em um criativo 320 × 100, `320x100.html` mostra o desenho mobile dedicado;
- os candidatos, filtros e a navegação continuam funcionando dentro da página hospedada.

Para abrir diretamente a área de candidatos, acrescente `?view=candidatos` ao `src` do formato desejado:

```html
src="https://previa.paineleleitoralnews.com.br/1260x200.html?view=candidatos"
```

Não adicione `sandbox` ao iframe. Um `sandbox` sem `allow-scripts` impediria o carregamento dos candidatos e o funcionamento dos filtros.

## Configuração obrigatória no Ad Manager

O código acima não precisa ser alterado, mas os dois tamanhos precisam existir no inventário e no item de linha:

1. 1260 × 200 para desktop;
2. 320 × 100 para mobile.

No Google Ad Manager, um criativo personalizado só pode ter um `Target ad unit size`. Portanto, cadastre o código desktop no tamanho desktop e o código de `320x100.html` no tamanho 320 × 100. Essa etapa não pode ser automatizada pelo HTML do banner.

O slot do site também precisa solicitar o tamanho certo para cada viewport. Exemplo de size mapping com Google Publisher Tag:

```js
const mapping = googletag.sizeMapping()
  .addSize([1260, 0], [[1260, 200]])
  .addSize([0, 0], [[320, 100]])
  .build();

googletag
  .defineSlot('/REDE/UNIDADE', [
    [1260, 200],
    [320, 100]
  ], 'banner-eleicoes')
  .defineSizeMapping(mapping)
  .addService(googletag.pubads());
```

Esse JavaScript pertence à tag GPT do site, não ao código do criativo. Se o portal já possui slots responsivos configurados para esses tamanhos, o cliente precisa apenas cadastrar as duas associações.

## Outros formatos

Todos os snippets usam a mesma estrutura. No desktop, escolha a URL do formato contratado; no mobile, use sempre o criativo dedicado `320x100.html`:

| Formato | URL | tamanho desktop | tamanho mobile |
| --- | --- | ---: | ---: |
| Página ampla | `/index.html` | 1180 × 680 | `/320x100.html`, 320 × 100 |
| Horizontal | `/horizontal.html` | 1200 × 100 | `/320x100.html`, 320 × 100 |
| 970 × 90 | `/970x90.html` | 970 × 90 | `/320x100.html`, 320 × 100 |
| 970 × 250 | `/970x250.html` | 970 × 250 | `/320x100.html`, 320 × 100 |
| 970 × 250/100 | `/970x250x100.html` | 970 × 250 | `/320x100.html`, 320 × 100 |
| 1260 × 100 | `/1260x100.html` | 1260 × 100 | `/320x100.html`, 320 × 100 |
| 1260 × 200/100 | `/1260x200.html` | 1260 × 200 | `/320x100.html`, 320 × 100 |

Os formatos 300 × 250 e 300 × 600 permanecem disponíveis como formatos fixos separados. Para a versão mobile dos banners desktop, cadastre somente 320 × 100.

## Por que o tamanho não pode ser decidido somente pelo iframe

O iframe consegue adaptar o conteúdo à área recebida, mas não consegue alterar o tamanho do slot externo do Google Ad Manager. Além disso, criativos personalizados do Ad Manager são associados a um único tamanho de inventário.

Por isso, a integração confiável funciona nesta ordem:

1. o site e o Ad Manager selecionam o tamanho desktop ou 320 × 100;
2. o criativo desktop ou o mobile dedicado preenche 100% do tamanho selecionado;
3. a página hospedada detecta a largura real do iframe por CSS;
4. o banner monta automaticamente o layout desktop ou mobile;
5. o JavaScript hospedado mantém candidatos e filtros funcionando.

Não existe código HTML dentro do criativo que consiga cadastrar ou redimensionar sozinho o slot externo do Ad Manager.
