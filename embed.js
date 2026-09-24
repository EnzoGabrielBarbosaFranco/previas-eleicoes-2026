(function () {
    'use strict';

    const LIMITE_MOBILE = 760;
    const SELETOR = 'iframe.previa-eleitoral';
    const formatos = {
        index: { largura: 1180, altura: 680, alturaMobile: 250 },
        horizontal: { largura: 1200, altura: 100, alturaMobile: 250 },
        '970x250': { largura: 970, altura: 250 },
        '970x250x100': { largura: 970, altura: 250, alturaMobile: 100, limiteMobile: 969 },
        '300x600': { largura: 300, altura: 600 },
        '300x250': { largura: 300, altura: 250 }
    };

    function obterFormato(iframe) {
        const classe = Object.keys(formatos).find((formato) => iframe.classList.contains(`previa-${formato}`));
        if (classe) return classe;

        try {
            const arquivo = new URL(iframe.src, document.baseURI).pathname.split('/').pop() || 'index.html';
            const formato = arquivo.replace(/\.html$/i, '');
            return Object.hasOwn(formatos, formato) ? formato : 'index';
        } catch {
            return 'index';
        }
    }

    function aplicarEstilo(iframe, propriedade, valor) {
        iframe.style.setProperty(propriedade, valor, 'important');
    }

    function ajustarIframe(iframe) {
        const formato = obterFormato(iframe);
        const dimensoes = formatos[formato];

        iframe.dataset.previaFormato = formato;
        iframe.width = String(dimensoes.largura);
        iframe.height = String(dimensoes.altura);
        iframe.scrolling = 'no';

        aplicarEstilo(iframe, 'display', 'block');
        aplicarEstilo(iframe, 'box-sizing', 'border-box');
        aplicarEstilo(iframe, 'width', formato === '970x250x100' ? '100%' : `${dimensoes.largura}px`);
        aplicarEstilo(iframe, 'max-width', `${dimensoes.largura}px`);
        aplicarEstilo(iframe, 'height', `${dimensoes.altura}px`);
        aplicarEstilo(iframe, 'margin-inline', 'auto');
        aplicarEstilo(iframe, 'padding', '0');
        aplicarEstilo(iframe, 'border', '0');
        aplicarEstilo(iframe, 'overflow', 'hidden');

        if (!dimensoes.alturaMobile) return;

        const atualizarAltura = () => {
            const larguraDisponivel = iframe.parentElement?.getBoundingClientRect().width || window.innerWidth;
            const limiteMobile = dimensoes.limiteMobile || LIMITE_MOBILE;
            const mobile = Math.min(window.innerWidth, larguraDisponivel) <= limiteMobile;
            const altura = mobile ? dimensoes.alturaMobile : dimensoes.altura;

            iframe.height = String(altura);
            aplicarEstilo(iframe, 'height', `${altura}px`);
        };

        atualizarAltura();

        if ('ResizeObserver' in window) {
            const observador = new ResizeObserver(atualizarAltura);
            observador.observe(iframe.parentElement || iframe);
        } else {
            window.addEventListener('resize', atualizarAltura, { passive: true });
        }
    }

    function iniciar(raiz = document) {
        if (raiz.matches?.(SELETOR) && !raiz.dataset.previaAjustada) {
            raiz.dataset.previaAjustada = 'true';
            ajustarIframe(raiz);
        }

        raiz.querySelectorAll?.(SELETOR).forEach((iframe) => {
            if (iframe.dataset.previaAjustada) return;
            iframe.dataset.previaAjustada = 'true';
            ajustarIframe(iframe);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => iniciar(), { once: true });
    } else {
        iniciar();
    }

    if ('MutationObserver' in window) {
        new MutationObserver((mutacoes) => {
            mutacoes.forEach((mutacao) => mutacao.addedNodes.forEach((no) => {
                if (no.nodeType === Node.ELEMENT_NODE) iniciar(no);
            }));
        }).observe(document.documentElement, { childList: true, subtree: true });
    }
})();
