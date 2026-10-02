# Hospedagem estática e redução de requisições

Publicação de teste concluída em 1º de outubro de 2026, após autorização do usuário:

- Projeto separado: `previas-eleicao-2026` (Direct Upload, sem Functions e sem domínio próprio).
- Endereço de teste: https://previas-eleicao-2026.pages.dev/
- Endereço desta publicação: https://0824fbe1.previas-eleicao-2026.pages.dev/

O domínio dos clientes, o DNS e a Vercel não foram alterados. O tráfego dos clientes atuais ainda não foi migrado.

Os testes no endereço publicado passaram: dez formatos, redirecionamentos com parâmetros, conteúdo igual ao build, CSP de iframe, cache HTTP, abas, cargo, UF, partido, busca, 404, cache ao retornar a um filtro, embed entre origens diferentes e iframe remoto 320×100 dentro de uma página desktop de 1400px. Não foram observadas requisições à Vercel no tráfego monitorado pelo teste. A validação em um criativo real do Ad Manager continua pendente.

Para repetir a verificação somente de leitura na hospedagem de teste:

```powershell
node scripts/testar-pages.js https://previas-eleicao-2026.pages.dev
```

Esse comando regenera o build local e faz verificações HTTP/navegador; não publica novamente. Uma nova publicação ou a troca de DNS exigem nova autorização explícita.

## Por que mudar

O painel enviado mostra 412 mil de 1 milhão de requisições em 30 dias (41,2%). Isso não indica saturação de CPU ou transferência; o risco observado é consumir a cota de requisições com o crescimento dos acessos. O painel não permite atribuir todo esse consumo aos quatro sites.

A Vercel contabiliza requisições aos arquivos estáticos, mesmo sem executar um backend. Cache na CDN da Vercel não elimina esse contador; cache fresco no navegador pode evitar uma nova requisição. [Documentação da Vercel](https://vercel.com/docs/manage-cdn-usage).

Este projeto contém apenas HTML, CSS, JavaScript e JSON. As consultas automáticas atuais ocorrem a cada 6 horas; cargo e UF consultam arquivos locais, enquanto partido e busca filtram no navegador. As fotos já estão incorporadas nos JSONs, sem uma requisição separada por candidato.

O Cloudflare Pages permite requisições gratuitas e ilimitadas aos arquivos estáticos, desde que não invoquem Functions. Essa é a modalidade preparada aqui: sem Functions, Worker, API, proxy ou banco de dados. Não significa que o serviço seja isento de todos os limites. [Preços do Pages](https://developers.cloudflare.com/pages/functions/pricing/).

## O que foi alterado

- `embed.js` obtém o endereço dos banners a partir da URL do próprio script. Carregar o script pelo domínio próprio não manda mais os iframes obrigatoriamente para a Vercel. O fallback inline antigo foi preservado.
- A consulta JSON respeita o cache HTTP, em vez de exigir revalidação a cada consulta.
- Na Vercel, os caminhos mutáveis de scripts, estilos e dados têm cache de navegador de 5 minutos. O layout e os intervalos de atualização não foram alterados.
- O build do Pages reúne configuração e aplicação em um script, e os estilos em uma folha por formato. Os arquivos gerados têm hash no nome e cache de 1 ano; mudanças geram novos nomes.
- O build acrescenta uma versão às consultas JSON, calculada a partir dos dados. Publicar uma nova base muda a versão sem mudar os códigos de iframe.
- Caminhos antigos de `assets/` e `data/` continuam no build, com cache de 5 minutos, para compatibilidade. Não receberam `immutable`.
- `404.html` evita o fallback de aplicação SPA do Pages: um JSON ausente deve resultar em 404, não em HTML com status 200. [Comportamento de rotas do Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/).

## Gerar e verificar localmente

Requer Node 22 ou superior. O teste de navegador usa Chrome ou Edge instalado, em perfil isolado e sem janela visível.

```powershell
node scripts/validar-candidatos-2026.js
node scripts/testar-pages.js --fonte
node scripts/testar-pages.js
```

O modo `--fonte` testa os arquivos originais usados pela Vercel com as regras de `vercel.json`; não usa o empacotamento ou os redirecionamentos do Pages. Ambos os modos validam também os dez snippets de entrega e a ausência do ZIP removido.

O teste padrão também gera `dist-pages/`. Para apenas gerar:

```powershell
node scripts/preparar-pages.js
```

`dist-pages/` contém somente a entrega estática; não inclui `.git`, documentos, scripts de manutenção ou um ZIP do Ad Manager. O gerador substitui apenas uma pasta `dist-pages/` identificada como seu próprio build. Não guarde arquivos pessoais nela.

Resultado da verificação inicial: 132 arquivos, 31,25 MiB no total, 109 bases e 18.993 candidaturas validadas. O gerador verifica os limites de 20.000 arquivos e 25 MiB por arquivo do Pages Free. [Limites oficiais](https://developers.cloudflare.com/pages/platform/limits/).

Os testes locais verificam os dez formatos, abas, filtros, busca, cache ao voltar a um estado, 404, URL do embed e alturas desktop/mobile. O servidor de testes simula rotas e cabeçalhos; não substitui a validação no Cloudflare e em um criativo real do Ad Manager.

## Revisar e subir ao Git

As alterações são locais e o projeto Pages publicado permanece separado. Depois de executar os testes acima, revisar `git diff` e os arquivos novos de scripts, `_headers`, `404.html`, `.gitignore` e esta documentação.

Os snippets dos clientes mantêm o domínio próprio. As alterações anteriores em `assets/previa.css` foram preservadas, sem novos ajustes visuais na revisão da migração. `PROMPT-INTEGRACAO-EMBED-ADMANAGER.md` também é um arquivo de trabalho anterior; revisar separadamente se deve fazer parte do commit.

`dist-pages/`, `.pages-tests/` e `.wrangler/` são gerados/locais e estão ignorados pelo Git. Não versionar perfis de navegador, caches, credenciais ou artefatos de deploy. O script `seguranca.js` continua disponível por compatibilidade, mas não é carregado pelos HTMLs de formato; não ativá-lo como parte desta migração.

O usuário pode subir o commit revisado. Se o Git estiver ligado a deploy automático da Vercel, esse push poderá publicar também na Vercel. O Pages atual é Direct Upload e não publica automaticamente por push. Nenhuma troca de DNS é feita pelo Git ou pelos scripts de teste.

Antes de migrar o domínio, validar um criativo de teste desktop e um 320×100 no Ad Manager real. O registro DNS atual e as regras de segurança/cache do domínio ainda precisam ser conferidos na etapa de migração; não considerar a troca concluída apenas porque o teste Pages está no ar.

## Publicar primeiro em um endereço temporário

Somente após autorização explícita para o destino escolhido:

1. Criar um projeto Pages com nome disponível, por exemplo `previas-eleicao-2026`, sem domínio próprio e sem Functions.
2. Enviar **o conteúdo de `dist-pages/`**, não a raiz do repositório. O Direct Upload aceita uma pasta, sem necessidade de ZIP. [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).
3. Abrir o endereço `*.pages.dev` efetivamente atribuído e testar o embed e os iframes dos formatos desktop e `320x100.html`.
4. Conferir no navegador: nenhum banner ou JSON buscando a Vercel, filtros funcionando, CSP permitindo iframe e cache configurado corretamente.
5. Testar também o criativo no Ad Manager/SafeFrame. A hospedagem nova não corrige margem, altura ou fundo cinza que pertençam ao contêiner do portal.

Para futura integração Git, o comando de build é `node scripts/preparar-pages.js` e a pasta de saída é `dist-pages`. Conectar a branch de produção habilita publicações automáticas; isso exige autorização própria. Projetos criados por Direct Upload não podem depois ser convertidos para integração Git no mesmo projeto.

## Manter os códigos dos clientes

Depois de aprovar o teste temporário, solicitar **nova autorização** para associar e trocar o DNS de `previa.paineleleitoralnews.com.br`.

Mantendo esse domínio e os caminhos, os códigos existentes de clientes que já o usam podem continuar iguais: tanto `embed.js` quanto `1260x200.html`, `1260x100.html`, `320x100.html` e os demais formatos. O Pages pode redirecionar `.html` para o caminho sem extensão; verificar esse redirecionamento com os parâmetros usados pelos clientes antes da troca.

Cadastrar o domínio no projeto Pages antes de apontar o CNAME, e esperar HTTPS válido. É um subdomínio: não é necessário migrar o domínio inteiro nem os nameservers para usar Pages. Se o DNS estiver na própria Cloudflare, o cadastro pode criar/alterar o registro automaticamente; não realizar essa etapa antes da autorização de troca. [Domínio personalizado](https://developers.cloudflare.com/pages/configuration/custom-domains/).

**Exceção importante:** URLs `previas-eleicoes-2026.vercel.app` pertencem à Vercel. Não podem ser transferidas via DNS para Cloudflare. Clientes que usam esse endereço precisam passar a usar o domínio próprio para deixar de consumir a Vercel. Até lá, manter a hospedagem antiga disponível; não apagar o projeto.

Registrar o DNS anterior antes da troca e manter a Vercel como alternativa de retorno. A mudança exige acompanhar propagação, certificado, regras existentes de cache/segurança e os quatro sites. Não ativar regras gerais de cache longo para HTML ou JSON; os cabeçalhos necessários estão em `_headers`.

## Atualizações depois da migração

Atualizar a base/configuração, validar, gerar novamente e solicitar autorização antes de cada publicação externa. Nunca publicar somente um JSON isolado sem regenerar o build: a versão dos dados precisa acompanhar a nova base.

Uma aba já aberta mantém a atualização automática de 6 horas. Arquivos mutáveis em cache podem levar até 5 minutos para expirar; os novos HTMLs do Pages apontam para scripts versionados e uma nova versão de dados após cada publicação que os altere. Não prometer atualização instantânea em abas antigas.
