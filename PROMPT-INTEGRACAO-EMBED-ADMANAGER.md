# Prompt para revisar a integração e preparar a entrega dos banners

Copie o bloco abaixo para a conversa do projeto que contém o `embed.js` anexado. As observações se baseiam nesse arquivo e na experiência com a prévia eleitoral; confira os HTMLs, CSS e JavaScript do projeto de destino antes de implementar.

```text
Analise e implemente as melhorias necessárias na integração dos nossos banners eleitorais. Leia o embed.js deste projeto, os HTMLs que ele carrega, seus CSS, scripts, configuração de hospedagem e exemplos de incorporação. Não limite o trabalho à documentação: corrija o comportamento necessário, valide e gere os códigos finais para os clientes.

CONTEXTO E OBJETIVO

Temos dois canais de integração:

1. Clientes que incorporam diretamente no portal usam embed.js e os componentes existentes. Preserve essa integração e a compatibilidade das tags eleicoes-widget e previa-eleitoral-2026. Preserve também o suporte existente a 2022 e 2026; não crie rotas de 2022 que não existem.
2. Clientes que usam Google Ad Manager recebem somente código de iframe, com estilos inline limitados a esse elemento. Não inclua embed.js, Web Components ou JavaScript no código cadastrado no criativo. O JavaScript dentro da página hospedada continua necessário para dados, candidatos, filtros, navegação e atualizações.

No Ad Manager, o único acompanhante mobile dos formatos desktop é 320x100.html, contratado e cadastrado como 320×100. Os produtos 300×250 e 300×600 continuam sendo formatos fixos separados.

A regra de 320×100 é da entrega mobile do Ad Manager. Não substitua por ela a responsividade já contratada dos banners incorporados diretamente com embed.js, como o 970×90 que mantém 90px de altura no mobile.

1. INVENTARIE O CONTRATO REAL

- Identifique os formatos existentes, os arquivos, os anos suportados e as dimensões desktop/mobile realmente implementadas no CSS.
- Verifique index/padrao, horizontal, 970x90, 970x250, 970x250x100, 1260x100, 1260x200, 320x100, 300x250 e 300x600. Não trate formato inexistente como já implementado. Identifique o que falta no projeto e implemente os formatos necessários de 2026 preservando o desenho e as funções existentes.
- Confira a estrutura de publicação: o embed anexado resolve as URLs a partir da localização do script e usa o prefixo 2026/ em algumas rotas. Valide isso contra a estrutura real. Não copie o domínio nem as rotas do projeto anterior sem verificar.
- Confira os atributos das tags e os parâmetros que os HTMLs efetivamente leem. No anexo, a tag envia visao, marca, corPrimaria, corDestaque e corClara. Na prévia anterior, o consumidor lê view, nome, cor1, cor2 e cor3. Essa diferença só é um defeito se o consumidor deste projeto não aceitar o contrato enviado. Corrija o mapeamento real e preserve aliases já usados pelos clientes.

2. CORRIJA O EMBED PARA PORTAIS SEM AD MANAGER

- Preserve a resolução da base pela URL do script, o Shadow DOM, a possibilidade de vários banners na mesma página e a proteção contra registro duplicado das tags.
- Unifique o cálculo de dimensões em funções compartilhadas quando possível, mantendo as diferenças necessárias entre anos e formatos. As duas classes do anexo usam critérios diferentes: uma considera contêiner/janela a 760px; a outra usa somente a janela com breakpoint padrão 1050.
- Use a largura útil efetivamente entregue ao iframe para manter o layout interno e a altura externa sincronizados. Considere padding/bordas do contêiner; getBoundingClientRect().width do pai não é necessariamente sua largura útil.
- Exemplo obrigatório: se o CSS interno mantém o 1260x200 com 200px acima de 760px, não reduza o iframe a 100px só porque breakpoint="1050" e a janela tem 1000px. Isso cortaria o layout desktop. Da mesma forma, uma coluna de 360px numa janela de 1440px precisa receber altura compatível com o layout compacto que seu iframe realmente exibe.
- Preserve o atributo breakpoint, mas defina e documente sua relação com o breakpoint estrutural dos HTMLs. Ele não pode produzir uma altura incompatível com o conteúdo. Para o comportamento padrão, mantenha o desenho desktop entre 761 e 1050px quando houver largura útil suficiente, conforme o CSS existente.
- Observe mudanças reais no contêiner e, quando necessário, no componente. Evite ciclos de ResizeObserver causados pelas próprias alterações de estilo; só escreva dimensões quando houver mudança. Desconecte observadores e listeners ao remover o componente.
- Trate contêiner inicialmente oculto ou sem largura e sua posterior exibição. Não use automaticamente a largura inteira da janela para renderizar um banner dentro de um pai oculto.
- Em resize e mudanças de breakpoint, preserve o iframe, a página ativa e os filtros. Atualizações de título/loading também não devem reconstruir a página desnecessariamente. Troca de URL/formato/ano deve ser tratada explicitamente.
- Reserve dimensões desde a renderização inicial para evitar o iframe padrão 300×150 e saltos de layout. Valide títulos, carregamento e parâmetros, sem interpolar dados arbitrários em HTML.
- Os atributos width/height e os dados de diagnóstico precisam refletir as dimensões reais, incluindo quando um formato nominalmente largo foi limitado por uma coluna estreita.

3. TORNE 320x100 UM FORMATO COMPACTO EM QUALQUER TELA

- A composição de 320x100.html deve ser a mesma quando aberta numa janela desktop e dentro de um iframe de 320×100. Não deixe sua estrutura depender exclusivamente de @media da janela.
- Mantenha 320×100 como tamanho nominal fixo, sem crescer para 360 ou 400px na pré-visualização. Defina explicitamente o comportamento quando o espaço disponível for menor que 320px, sem esconder funções como solução.
- Na visão geral, mantenha a identidade, as informações importantes e a navegação compacta.
- Em candidatos, priorize os quatro filtros existentes, a lista e a navegação; remova o cabeçalho dispensável. Estado desabilitado do filtro nacional não é um defeito, desde que o texto continue legível.
- Zere a herança de grid-template-rows: repeat(2, 32px) dos filtros horizontais. Em 320×100 os filtros devem ocupar uma única linha, inteira e legível, inclusive no desktop.
- Calcule o espaço interno considerando as bordas. Um widget de 100px com bordas de 1px tem 98px úteis; com navegação de 24px sobram 74px, não 76px. Use linhas flexíveis e min-height:0 para evitar sobreposição e corte dos candidatos.
- A barra horizontal não pode consumir espaço reservado à lista ou à navegação. Se ocultar sua representação visual, mantenha rolagem e interação funcionais. Não use apenas overflow:hidden para mascarar conteúdo cortado.
- Ao alternar Visão geral/Candidatos, somente o botão ativo deve ficar destacado. Confira especialmente 970x90 e 1260x100; não mantenha uma regra que colore Candidatos quando ele não está ativo.

4. PREPARE CÓDIGOS ESPECÍFICOS PARA O AD MANAGER

- Gere um arquivo .txt por formato desktop e um único 320x100.txt mobile, com URL absoluta HTTPS, title, width e height explícitos, borda e margem zero e display:block.
- Use estilo inline no próprio iframe. Não inclua seletores globais html/body/* nem regras que atinjam o portal.
- Confira o position:absolute/inset e width/height:100% usados nos exemplos: valide dentro do documento do criativo, com dimensões conhecidas. Não trate esse snippet como código genérico para colar diretamente no corpo do portal, onde poderia cobrir outros elementos. Escolha dimensões fixas ou preenchimento conforme o teste comprovar para o contexto do criativo.
- Não prometa que o iframe externo se redimensiona sozinho nem que uma única associação de tamanho serve automaticamente desktop e mobile. O cliente precisa cadastrar o criativo desktop e o criativo 320×100, e o inventário/tag do portal precisa solicitar os tamanhos correspondentes.
- Separe claramente: código do criativo, configuração obrigatória do Ad Manager e eventual size mapping da tag GPT do portal. Não inclua código GPT dentro do snippet do criativo.
- Não adicione sandbox que impeça scripts, dados ou ações necessárias. Verifique se HTTPS e os cabeçalhos de enquadramento permitem a integração; não amplie permissões da hospedagem sem necessidade.
- Use os mesmos parâmetros de personalização e página inicial que o HTML realmente aceita. O cliente deve receber arquivos completos e prontos, não modelos cheios de placeholders.
- Não gere entrega-admanager.zip.

5. DIFERENCIE CORTE INTERNO DE ESPAÇO EXTERNO

- Meça o widget, painel, filtros, lista, navegação, iframe do banner e contêiner externo quando houver falha. Não conclua pela captura que a URL está errada, que falta deploy ou que é cache sem conferir.
- Um contêiner do portal com height:110px e um SafeFrame de 100px deixam 10px externos. O conteúdo hospedado não consegue eliminar essa área do portal. Documente a correção pontual do slot quando necessária; não mande uma regra genérica que force todos os anúncios do portal a terem 100px.
- Não tente preencher sobra externa esticando o banner ou mudando seu tamanho contratado de 320×100. Preserve eventuais margens do portal e identifique exatamente qual caixa gera a faixa cinza.
- Parâmetro ?v=... no HTML não garante invalidar o cache dos CSS/JS que ele referencia. Quando necessário, use uma estratégia coerente de versão dos recursos e confirme a versão efetivamente carregada.

6. VALIDE ANTES DA ENTREGA

- Teste os tamanhos nominais de todos os formatos e as duas áreas. No 320×100, clique na navegação e nos filtros; conferir só a existência dos elementos não basta.
- Teste janela larga com contêiner estreito, pais com padding, mudança de largura sem resize da janela, componente oculto/reexibido e vários banners simultâneos.
- Teste larguras imediatamente abaixo/acima de 760 e 1050px para detectar divergências entre embed e CSS. Preserve o comportamento 2022.
- Teste 320x100 aberto em janela desktop e dentro de iframe REAL de 320×100, inclusive aninhado num documento de criativo e num contêiner externo de 110px. Headless pode impor viewport mínimo: screenshot de janela de 320px não comprova que o iframe tem 320px.
- Confira limites reais por getBoundingClientRect, clientHeight e scrollHeight. Não valide cortes usando capturas com barras escondidas artificialmente pelo navegador.
- Confira funcionamento de dados, filtros, busca, navegação e URLs configuráveis. Verifique que resize não reseta a consulta.
- Em testes locais, chame o ambiente de simulação de iframe aninhado; não afirme ter validado num SafeFrame real do Google sem acesso a esse ambiente. Identifique o que falta confirmar no Ad Manager do cliente.

ENTREGA FINAL

Entregue os arquivos corrigidos, os snippets .txt completos e um guia curto que distingue integração direta com embed.js de integração com Ad Manager. No guia, mostre o exemplo desktop contratado e o mobile único 320×100, com os tamanhos de cadastro.

Informe o que mudou, o que foi testado e quaisquer dependências reais do portal. Preserve mudanças locais existentes. Não publique, faça deploy ou envie alterações para remoto: deixe tudo pronto para revisão local e peça autorização específica antes de qualquer publicação.
```

Referências para conferir as exigências do Google:

- [Criativos personalizados: código Standard e tamanho-alvo](https://support.google.com/admanager/answer/3180782?hl=en).
- [Tamanhos e anúncios responsivos com GPT](https://developers.google.com/publisher-tag/guides/ad-sizes).
