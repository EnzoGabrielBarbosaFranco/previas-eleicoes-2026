'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const raiz = path.resolve(__dirname, '..');
const destino = path.join(raiz, 'dist-pages');
const marcador = '.pages-build.json';
const formatos = ['index', 'horizontal', '970x90', '970x250', '970x250x100',
    '1260x100', '1260x200', '320x100', '300x250', '300x600'];
const hash = (conteudo) => crypto.createHash('sha256').update(conteudo).digest('hex').slice(0, 16);
const ler = (arquivo) => fs.readFileSync(path.join(raiz, arquivo), 'utf8');

function listar(diretorio, prefixo = '') {
    return fs.readdirSync(diretorio, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
        .flatMap((entrada) => {
            const relativo = path.posix.join(prefixo, entrada.name);
            if (entrada.isSymbolicLink()) throw new Error(`Link simbólico não permitido: ${relativo}`);
            return entrada.isDirectory()
                ? listar(path.join(diretorio, entrada.name), relativo) : [relativo];
        });
}

function gerar() {
    // Primeiro prepara todo o conteúdo em memória: falhas não apagam um build anterior.
    const arquivos = new Map();
    for (const pasta of ['assets', 'data']) {
        if (fs.lstatSync(path.join(raiz, pasta)).isSymbolicLink()) throw new Error(`Link simbólico não permitido: ${pasta}`);
        for (const relativo of listar(path.join(raiz, pasta))) {
            const arquivo = `${pasta}/${relativo}`;
            arquivos.set(arquivo, fs.readFileSync(path.join(raiz, arquivo)));
        }
    }

    const versaoDados = crypto.createHash('sha256');
    for (const [arquivo, conteudo] of arquivos) {
        if (arquivo.startsWith('data/2026/') && arquivo.endsWith('.json')) {
            versaoDados.update(arquivo).update('\0').update(conteudo).update('\0');
        }
    }
    const versaoCache = versaoDados.digest('hex').slice(0, 16);
    const js = `${ler('assets/config.js')}\n;window.PREVIA_ELEITORAL_CONFIG.fonteDados.versaoCache = '${versaoCache}';\n${ler('assets/previa.js')}`;
    const css = ler('assets/previa.css');
    const cssMobile = `${css}\n${ler('assets/320x100.css')}`;
    const jsUrl = `./static/app.${hash(js)}.js`;
    const cssUrl = `./static/previa.${hash(css)}.css`;
    const cssMobileUrl = `./static/320x100.${hash(cssMobile)}.css`;
    for (const [url, conteudo] of [[jsUrl, js], [cssUrl, css], [cssMobileUrl, cssMobile]]) {
        arquivos.set(url.slice(2), Buffer.from(conteudo));
    }

    for (const formato of formatos) {
        const arquivo = `${formato}.html`;
        let html = ler(arquivo);
        const compactado = formato === '320x100';
        const referencias = html.match(/(?:href|src)="\.\/assets\/[^\"]+"/g) || [];
        if (referencias.length !== (compactado ? 4 : 3)) throw new Error(`Referências inesperadas: ${arquivo}`);
        html = html.replace('<link rel="stylesheet" href="./assets/previa.css">',
            `<link rel="stylesheet" href="${compactado ? cssMobileUrl : cssUrl}">`)
            .replace(/\s*<link rel="stylesheet" href="\.\/assets\/320x100\.css">/, '')
            .replace('<script src="./assets/config.js"></script>', `<script src="${jsUrl}"></script>`)
            .replace(/\s*<script src="\.\/assets\/previa\.js"><\/script>/, '');
        if (html.includes('./assets/')) throw new Error(`Referência não processada: ${arquivo}`);
        arquivos.set(arquivo, Buffer.from(html));
    }
    for (const arquivo of ['embed.js', '404.html', '_headers']) {
        arquivos.set(arquivo, Buffer.from(ler(arquivo)));
    }
    // Arquivo antigo disponível para clientes que o usem diretamente.
    if (fs.existsSync(path.join(raiz, 'seguranca.js'))) arquivos.set('seguranca.js', Buffer.from(ler('seguranca.js')));
    arquivos.set(marcador, Buffer.from(JSON.stringify({ gerador: 'preparar-pages-v1', versaoCache }, null, 2)));

    if (arquivos.size > 20000) throw new Error('Build excede 20.000 arquivos (Pages Free).');
    for (const [arquivo, conteudo] of arquivos) {
        if (conteudo.length > 25 * 1024 * 1024) throw new Error(`Arquivo excede 25 MiB: ${arquivo}`);
    }

    // Só substitui a pasta gerada por este script, nunca outra pasta ou um link.
    if (path.dirname(destino) !== raiz || path.basename(destino) !== 'dist-pages') throw new Error('Destino inseguro.');
    if (fs.existsSync(destino)) {
        if (fs.lstatSync(destino).isSymbolicLink() ||
            !fs.existsSync(path.join(destino, marcador)) ||
            JSON.parse(fs.readFileSync(path.join(destino, marcador), 'utf8')).gerador !== 'preparar-pages-v1') {
            throw new Error('dist-pages não é um build conhecido. Mova a pasta manualmente antes de continuar.');
        }
        fs.rmSync(destino, { recursive: true });
    }
    fs.mkdirSync(destino);
    // O marcador é gravado primeiro para que um build interrompido possa ser refeito.
    fs.writeFileSync(path.join(destino, marcador), arquivos.get(marcador));
    for (const [arquivo, conteudo] of arquivos) {
        const alvo = path.join(destino, arquivo);
        fs.mkdirSync(path.dirname(alvo), { recursive: true });
        fs.writeFileSync(alvo, conteudo);
    }
    const bytes = [...arquivos.values()].reduce((total, conteudo) => total + conteudo.length, 0);
    console.log(`Build estático: ${arquivos.size} arquivos, ${(bytes / 1024 / 1024).toFixed(2)} MiB.`);
    console.log(`Dados: ${versaoCache}. Saída: ${destino}`);
    console.log('Nenhuma publicação ou alteração de DNS foi realizada.');
    return { destino, formatos };
}

if (require.main === module) gerar();
module.exports = { gerar, formatos };
