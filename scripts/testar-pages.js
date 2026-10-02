'use strict';

// Testes locais ou contra uma URL Pages, sem publicar nada. Requer Node 22+ e Chrome/Edge.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { setTimeout: esperar } = require('node:timers/promises');
const { gerar, formatos: formatosSuportados } = require('./preparar-pages');

async function main() {
    const argumentos = process.argv.slice(2);
    const modoFonte = argumentos.includes('--fonte');
    const endereco = argumentos.find((argumento) => !argumento.startsWith('--'));
    assert(argumentos.every((argumento) => argumento === '--fonte' || argumento === endereco), 'Argumento desconhecido.');
    const origemRemota = endereco ? new URL(endereco).origin : null;
    assert(!(modoFonte && origemRemota), 'O modo --fonte é somente local.');
    if (origemRemota) {
        const url = new URL(origemRemota);
        assert(url.protocol === 'https:' && url.hostname.endsWith('.pages.dev'), 'Informe uma URL HTTPS de teste do Pages.');
    }
    const raiz = path.resolve(__dirname, '..');
    const { destino, formatos } = modoFonte ? { destino: raiz, formatos: formatosSuportados } : gerar();
    const ler = (arquivo) => fs.readFileSync(path.join(destino, arquivo), 'utf8');
    const contexto = { window: {}, document: { getElementById: () => null } };
    if (modoFonte) {
        vm.runInNewContext(ler('assets/config.js'), contexto);
        vm.runInNewContext(ler('assets/previa.js'), contexto);
    } else {
        const js = fs.readdirSync(path.join(destino, 'static')).find((arquivo) => arquivo.endsWith('.js'));
        vm.runInNewContext(ler(`static/${js}`), contexto);
        assert.equal(contexto.window.PREVIA_ELEITORAL_CONFIG.fonteDados.versaoCache,
            JSON.parse(ler('.pages-build.json')).versaoCache);
    }
    assert.equal(contexto.window.PREVIA_ELEITORAL_CONFIG.fonteDados.intervaloAtualizacaoMs, 21600000);
    for (const formato of formatos) {
        const html = ler(`${formato}.html`);
        assert.equal((html.match(/<script /g) || []).length, modoFonte ? 2 : 1);
        assert.equal((html.match(/rel="stylesheet"/g) || []).length, modoFonte && formato === '320x100' ? 2 : 1);
        assert(!html.includes('vercel.app'), `Origem externa inesperada: ${formato}`);
        for (const [, url] of html.matchAll(/(?:href|src)="(\.\/[^\"]+)"/g)) {
            assert(fs.existsSync(path.join(destino, url)), `Arquivo ausente: ${url}`);
        }
    }
    assert(!fs.existsSync(path.join(destino, 'functions')));
    assert(!fs.existsSync(path.join(destino, '_worker.js')));
    const embed = ler('embed.js');
    for (const [src, base] of [
        ['https://previa.paineleleitoralnews.com.br/embed.js?v=1', 'https://previa.paineleleitoralnews.com.br/'],
        ['https://teste.pages.dev/embed.js', 'https://teste.pages.dev/'],
        ['https://teste.pages.dev/2026/embed.js', 'https://teste.pages.dev/2026/'],
        [null, 'https://previas-eleicoes-2026.vercel.app/']
    ]) {
        let Componente;
        const registro = { get: () => null, define: (_, classe) => { Componente = classe; } };
        vm.runInNewContext(embed, {
            URL, HTMLElement: class {}, customElements: registro,
            window: { customElements: registro }, document: { currentScript: src ? { src } : null }
        });
        assert.equal(new Componente()._obterUrl('1260x200'), `${base}1260x200.html`);
    }
    // Confere todos os códigos enviados aos clientes, sem alterar o domínio ou os snippets.
    const pastaEntrega = path.join(raiz, 'entrega-admanager');
    assert(!fs.existsSync(path.join(raiz, 'entrega-admanager.zip')), 'Não recriar o ZIP de entrega removido.');
    for (const arquivo of fs.readdirSync(pastaEntrega).filter((nome) => nome.endsWith('.txt') && nome !== 'LEIA-ME.txt')) {
        const snippet = fs.readFileSync(path.join(pastaEntrega, arquivo), 'utf8');
        assert(!/<(?:script|style)\b|previa-eleitoral-2026|sandbox\s*=/i.test(snippet), `${arquivo}: código inadequado para Ad Manager`);
        const [, src] = snippet.match(/src="([^"]+)"/) || [];
        assert(src, `${arquivo}: src ausente`);
        const url = new URL(src);
        assert.equal(url.origin, 'https://previa.paineleleitoralnews.com.br');
        assert(fs.existsSync(path.join(destino, url.pathname.slice(1))), `${arquivo}: HTML ausente`);
        const formato = url.pathname.slice(1, -5);
        const tamanho = formato === 'index' ? [1180, 680] : formato === 'horizontal' ? [1200, 100]
            : formato === '970x250x100' ? [970, 250] : formato.split('x').map(Number);
        assert.equal(Number(snippet.match(/\bwidth="(\d+)"/)[1]), tamanho[0], `${arquivo}: width incorreto`);
        assert.equal(Number(snippet.match(/\bheight="(\d+)"/)[1]), tamanho[1], `${arquivo}: height incorreto`);
        for (const propriedade of ['position:absolute', 'inset:0', 'display:block', 'width:100%', 'height:100%', 'margin:0', 'border:0']) {
            assert(snippet.includes(propriedade), `${arquivo}: falta ${propriedade}`);
        }
    }
    console.log(`${modoFonte ? 'Arquivos-fonte da Vercel' : 'Build Pages'}, configuração, origem do embed e dez snippets dos clientes: OK.`);
    if (origemRemota) {
        for (const formato of formatos) {
            const resposta = await fetch(`${origemRemota}/${formato}.html?view=candidatos`);
            assert.equal(resposta.status, 200, `${formato}: HTTP ${resposta.status}`);
            assert.equal(new URL(resposta.url).searchParams.get('view'), 'candidatos');
            assert.equal(resposta.headers.get('content-security-policy'), 'frame-ancestors *;');
            assert(!resposta.headers.get('x-frame-options'), `${formato}: iframe bloqueado por X-Frame-Options`);
            assert.equal(await resposta.text(), ler(`${formato}.html`), `${formato}: HTML diferente do build local`);
        }
        for (const arquivo of fs.readdirSync(path.join(destino, 'static'))) {
            const resposta = await fetch(`${origemRemota}/static/${arquivo}`);
            assert.equal(resposta.status, 200);
            assert.match(resposta.headers.get('cache-control'), /max-age=31536000/);
            assert.match(resposta.headers.get('cache-control'), /immutable/);
            assert.equal(await resposta.text(), ler(`static/${arquivo}`));
        }
        for (const arquivo of ['embed.js', 'data/2026/br/1.json']) {
            const resposta = await fetch(`${origemRemota}/${arquivo}`);
            assert.equal(resposta.status, 200);
            assert.match(resposta.headers.get('cache-control'), /max-age=300/);
            assert.equal(await resposta.text(), ler(arquivo));
        }
        console.log('Pages remoto: dez HTMLs, redirecionamentos, parâmetros, CSP, conteúdo e cache HTTP OK.');
    }

    const chrome = [process.env.PREVIA_TEST_BROWSER,
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'].find((arquivo) => arquivo && fs.existsSync(arquivo));
    assert(chrome, 'Instale Chrome/Edge ou informe PREVIA_TEST_BROWSER para testar no navegador.');
    const requisicoes = new Map();
    const regrasHeaders = [];
    for (const linha of (modoFonte ? '' : ler('_headers')).split(/\r?\n/)) {
        if (!linha.trim() || linha.trim().startsWith('#')) continue;
        if (!/^\s/.test(linha)) regrasHeaders.push({ padrao: linha.trim(), headers: [] });
        else {
            const [, nome, valor] = linha.match(/^\s+([^:]+):\s*(.+)$/) || [];
            assert(nome && regrasHeaders.length, `Regra inválida em _headers: ${linha}`);
            regrasHeaders.at(-1).headers.push([nome, valor]);
        }
    }
    if (modoFonte) {
        for (const regra of JSON.parse(ler('vercel.json')).headers) {
            regrasHeaders.push({ regex: new RegExp(`^${regra.source}$`), headers: regra.headers.map(({ key, value }) => [key, value]) });
        }
    }
    const servidor = http.createServer((req, res) => {
        const url = new URL(req.url, 'http://local');
        requisicoes.set(url.pathname, (requisicoes.get(url.pathname) || 0) + 1);
        if (url.pathname === '/teste-embed') {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(`<!doctype html><html><head><link rel="icon" href="data:,"></head><body><script src="${origemRemota || ''}/embed.js"></script><previa-eleitoral-2026 formato="1260x200" breakpoint="1050"></previa-eleitoral-2026></body></html>`);
            return;
        }
        if (url.pathname === '/teste-iframe') {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(`<!doctype html><html><head><link rel="icon" href="data:,"></head><body><div style="position:relative;width:320px;height:100px"><iframe src="${origemRemota || ''}/320x100.html?view=candidatos" width="320" height="100" scrolling="no" style="position:absolute;inset:0;display:block;width:100%;height:100%;margin:0;border:0;overflow:hidden"></iframe></div></body></html>`);
            return;
        }
        // Simula o redirecionamento .html -> URL sem extensão do Pages, preservando parâmetros.
        if (!modoFonte && url.pathname.endsWith('.html') && formatos.includes(url.pathname.slice(1, -5))) {
            res.writeHead(301, { Location: `${url.pathname.slice(0, -5)}${url.search}` });
            res.end();
            return;
        }
        const relativo = url.pathname === '/' ? 'index.html'
            : formatos.includes(url.pathname.slice(1)) ? `${url.pathname.slice(1)}.html` : url.pathname.slice(1);
        const alvo = path.resolve(destino, relativo);
        if (!alvo.startsWith(`${destino}${path.sep}`) || !fs.existsSync(alvo) || !fs.statSync(alvo).isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(ler('404.html'));
            return;
        }
        const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
            '.css': 'text/css; charset=utf-8', '.json': 'application/json' };
        res.setHeader('Content-Type', tipos[path.extname(alvo)] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-cache');
        for (const regra of regrasHeaders) {
            const [prefixo, sufixo] = (regra.padrao || '').split('*');
            const corresponde = regra.regex ? regra.regex.test(url.pathname)
                : sufixo === undefined ? url.pathname === prefixo : url.pathname.startsWith(prefixo) && url.pathname.endsWith(sufixo);
            if (corresponde) {
                for (const [nome, valor] of regra.headers) res.setHeader(nome, valor);
            }
        }
        res.end(fs.readFileSync(alvo));
    });
    await new Promise((resolve) => servidor.listen(0, '127.0.0.1', resolve));
    const origemLocal = `http://127.0.0.1:${servidor.address().port}`;
    const origem = origemRemota || origemLocal;
    fs.mkdirSync(path.join(raiz, '.pages-tests'), { recursive: true });
    const perfil = fs.mkdtempSync(path.join(raiz, '.pages-tests', 'chrome-'));
    const processo = spawn(chrome, ['--headless=new', '--no-first-run', '--no-default-browser-check',
        '--disable-background-networking', '--remote-debugging-port=0', `--user-data-dir=${perfil}`, 'about:blank'],
        { windowsHide: true, stdio: 'ignore' });
    let erroProcesso;
    processo.on('error', (erro) => { erroProcesso = erro; });
    let socket;
    try {
        const portaArquivo = path.join(perfil, 'DevToolsActivePort');
        let dadosPorta;
        for (let tentativa = 0; tentativa < 150; tentativa++) {
            if (erroProcesso) throw erroProcesso;
            try {
                const dados = fs.readFileSync(portaArquivo, 'utf8').trim();
                // No Windows o arquivo pode existir ainda vazio ou bloqueado durante a escrita.
                if (/^\d+\r?\n\/devtools\//.test(dados)) {
                    dadosPorta = dados;
                    break;
                }
            } catch (erro) {
                if (!['ENOENT', 'EBUSY', 'EPERM', 'EACCES'].includes(erro.code)) throw erro;
            }
            await esperar(100);
        }
        assert(dadosPorta, 'Chrome não iniciou o modo de testes em 15 segundos.');
        const [porta, endpoint] = dadosPorta.split(/\r?\n/);
        socket = new WebSocket(`ws://127.0.0.1:${porta}${endpoint}`);
        await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
        let id = 0;
        const pendentes = new Map();
        const erros = [];
        const rede = new Map();
        const cache = new Set();
        socket.onmessage = ({ data }) => {
            const mensagem = JSON.parse(data);
            if (mensagem.id) {
                const pendente = pendentes.get(mensagem.id);
                if (!pendente) return;
                pendentes.delete(mensagem.id);
                clearTimeout(pendente.timer);
                mensagem.error ? pendente.reject(new Error(JSON.stringify(mensagem.error))) : pendente.resolve(mensagem.result);
            } else if (mensagem.method === 'Runtime.exceptionThrown') erros.push(mensagem.params.exceptionDetails);
            else if (mensagem.method === 'Network.requestWillBeSent') rede.set(mensagem.params.requestId, mensagem.params.request.url);
            else if (mensagem.method === 'Network.requestServedFromCache') cache.add(mensagem.params.requestId);
            else if (mensagem.method === 'Network.responseReceived' && mensagem.params.response.fromDiskCache) cache.add(mensagem.params.requestId);
        };
        function enviar(method, params = {}, sessionId) {
            return new Promise((resolve, reject) => {
                const numero = ++id;
                const timer = setTimeout(() => { pendentes.delete(numero); reject(new Error(`Timeout: ${method}`)); }, 10000);
                pendentes.set(numero, { resolve, reject, timer });
                socket.send(JSON.stringify({ id: numero, method, params, sessionId }));
            });
        }
        const { targetId } = await enviar('Target.createTarget', { url: 'about:blank' });
        const { sessionId } = await enviar('Target.attachToTarget', { targetId, flatten: true });
        const avaliar = async (expression) => {
            const retorno = await enviar('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
            if (retorno.exceptionDetails) throw new Error(JSON.stringify(retorno.exceptionDetails));
            return retorno.result.value;
        };
        await enviar('Runtime.enable', {}, sessionId);
        await enviar('Network.enable', {}, sessionId);
        async function aguardar(expressao) {
            for (let tentativa = 0; tentativa < (origemRemota ? 300 : 100); tentativa++) {
                if (await avaliar(expressao)) return;
                await esperar(50);
            }
            throw new Error(`Condição não atendida: ${expressao}`);
        }
        async function navegar(url, largura, altura) {
            await enviar('Emulation.setDeviceMetricsOverride', { width: largura, height: altura, deviceScaleFactor: 1, mobile: false }, sessionId);
            await enviar('Page.navigate', { url }, sessionId);
            const esperado = new URL(modoFonte ? url : url.replace(/\.html(?=\?|$)/, ''));
            if (origemRemota && esperado.pathname === '/index') esperado.pathname = '/';
            await aguardar(`location.href === ${JSON.stringify(esperado.href)} && !!document.querySelector('[data-pagina]')`);
        }
        const dimensoes = { index: [1180, 680], horizontal: [1200, 100], '970x90': [970, 90],
            '970x250': [970, 250], '970x250x100': [970, 250], '1260x100': [1260, 100],
            '1260x200': [1260, 200], '320x100': [320, 100], '300x250': [300, 250], '300x600': [300, 600] };
        for (const formato of formatos) {
            const [largura, altura] = dimensoes[formato];
            await navegar(`${origem}/${formato}.html?view=candidatos`, largura, altura);
            await aguardar("document.querySelectorAll('.pe-card').length > 0");
            const medidas = await avaliar("(() => {const r=document.getElementById('previa-widget').getBoundingClientRect();return {w:r.width,h:r.height,filtros:document.querySelectorAll('.pe-filtros select,.pe-filtros input').length}})()");
            assert(medidas.w <= largura + 1, `${formato}: largura excedida ${medidas.w}`);
            assert.equal(medidas.filtros, 4, `${formato}: filtros ausentes`);
            if (formato === '320x100') assert.equal(medidas.h, 100);
            await avaliar("document.querySelector('[data-pagina=\"inicio\"]').click()");
            await aguardar("!document.getElementById('pe-filtro-cargo')");
            await avaliar("document.querySelector('[data-pagina=\"candidatos\"]').click()");
            await aguardar("document.querySelectorAll('.pe-card').length > 0");
        }
        console.log('10 formatos: candidatos, quatro filtros e alternância de abas OK. 320x100 ocupa 100px.');

        await navegar(`${origem}/320x100.html?view=candidatos`, 320, 100);
        await aguardar("document.querySelectorAll('.pe-card').length > 0");
        const mudar = (campo, valor) => avaliar(`(() => {const s=document.getElementById(${JSON.stringify(campo)});s.value=${JSON.stringify(valor)};s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
        await mudar('pe-filtro-cargo', '3');
        await aguardar("document.querySelectorAll('.pe-card').length > 0 && document.getElementById('pe-filtro-uf').value==='sp'");
        await mudar('pe-filtro-uf', 'mt');
        await aguardar("document.querySelectorAll('.pe-card').length > 0");
        const totalDados = (caminho) => origemRemota
            ? [...rede].filter(([id, url]) => new URL(url).pathname.startsWith('/data/') &&
                (!caminho || new URL(url).pathname === caminho) && !cache.has(id)).length
            : [...requisicoes].filter(([url]) => url.startsWith('/data/') && (!caminho || url === caminho)).reduce((n, [, qtd]) => n + qtd, 0);
        const consultasSp = totalDados('/data/2026/sp/3.json');
        await mudar('pe-filtro-uf', 'sp');
        await aguardar("document.querySelectorAll('.pe-card').length > 0");
        assert.equal(totalDados('/data/2026/sp/3.json'), consultasSp, 'Voltar ao filtro SP fez nova requisição de rede.');
        const antes = totalDados();
        await avaliar("(() => {const p=document.getElementById('pe-filtro-partido');p.value=p.options[1].value;p.dispatchEvent(new Event('change'));const b=document.getElementById('pe-filtro-busca');b.value='999999';b.dispatchEvent(new Event('input'));})()");
        assert.equal(await avaliar("document.querySelectorAll('.pe-card').length"), 0);
        assert.equal(totalDados(), antes, 'Busca/partido consultaram a rede.');
        assert.equal((await fetch(`${origem}/data/2026/inexistente/1.json`)).status, 404);
        console.log('Cargo, UF, partido, busca, cache ao voltar ao filtro e 404: OK.');

        await enviar('Page.navigate', { url: `${origemLocal}/teste-embed` }, sessionId);
        await aguardar(origemRemota
            ? "document.querySelector('previa-eleitoral-2026')?.shadowRoot?.querySelector('iframe')"
            : "document.querySelector('previa-eleitoral-2026')?.shadowRoot?.querySelector('iframe')?.contentDocument?.querySelector('[data-pagina]')");
        const frameSrc = await avaliar("document.querySelector('previa-eleitoral-2026').shadowRoot.querySelector('iframe').src");
        assert.equal(frameSrc, `${origem}/1260x200.html`);
        for (const [largura, alturaEsperada] of [[1400, 200], [360, 100]]) {
            await enviar('Emulation.setDeviceMetricsOverride', { width: largura, height: 300, deviceScaleFactor: 1, mobile: false }, sessionId);
            await aguardar(`document.querySelector('previa-eleitoral-2026').getBoundingClientRect().height === ${alturaEsperada}`);
        }
        assert.equal(erros.length, 0, `Erros no navegador: ${JSON.stringify(erros)}`);
        console.log(`Embed ${origemRemota ? 'entre origens diferentes' : 'no mesmo servidor'}, desktop 200px e mobile 100px: OK.`);
        await enviar('Emulation.setDeviceMetricsOverride', { width: 1400, height: 300, deviceScaleFactor: 1, mobile: false }, sessionId);
        await enviar('Page.navigate', { url: `${origemLocal}/teste-iframe` }, sessionId);
        let medidasIframe;
        if (origemRemota) {
            let frame;
            for (let tentativa = 0; tentativa < 100; tentativa++) {
                const { targetInfos } = await enviar('Target.getTargets');
                frame = targetInfos.find((alvo) => alvo.type === 'iframe' && alvo.url.startsWith(`${origem}/320x100`));
                if (frame) break;
                await esperar(100);
            }
            assert(frame, 'Iframe remoto não apareceu no navegador.');
            const { sessionId: frameSession } = await enviar('Target.attachToTarget', { targetId: frame.targetId, flatten: true });
            for (let tentativa = 0; tentativa < 150; tentativa++) {
                const retorno = await enviar('Runtime.evaluate', {
                    expression: "(() => {const r=document.getElementById('previa-widget')?.getBoundingClientRect();return r && document.querySelectorAll('.pe-card').length ? {w:r.width,h:r.height,filtros:document.querySelectorAll('.pe-filtros select,.pe-filtros input').length} : null})()",
                    returnByValue: true
                }, frameSession);
                medidasIframe = retorno.result?.value;
                if (medidasIframe) break;
                await esperar(100);
            }
        } else {
            await aguardar("document.querySelector('iframe')?.contentDocument?.querySelectorAll('.pe-card').length > 0");
            medidasIframe = await avaliar("(() => {const f=document.querySelector('iframe');const d=f.contentDocument;const r=d.getElementById('previa-widget').getBoundingClientRect();return {w:r.width,h:r.height,filtros:d.querySelectorAll('.pe-filtros select,.pe-filtros input').length}})()");
        }
        assert.deepEqual(medidasIframe, { w: 320, h: 100, filtros: 4 });
        assert.equal(erros.length, 0);
        console.log('Iframe 320x100 em página desktop de 1400px: dimensões e quatro filtros OK.');
        assert(![...rede.values()].some((url) => new URL(url).hostname.endsWith('.vercel.app')), 'O teste requisitou a Vercel.');
        await enviar('Browser.close');
    } finally {
        socket?.close();
        if (processo.exitCode === null) processo.kill();
        await new Promise((resolve) => servidor.close(resolve));
        // Perfil temporário fica em .pages-tests (ignorado pelo Git), sem tocar no Chrome do usuário.
    }
}

main().catch((erro) => { console.error(erro); process.exitCode = 1; });
