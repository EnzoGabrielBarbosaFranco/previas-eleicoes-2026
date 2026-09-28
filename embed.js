(function () {
    'use strict';

    const LIMITE_MOBILE = 760;
    const MAX_NIVEIS_CONTAINER = 5;
    const SELETOR = 'iframe.previa-eleitoral';

    const formatos = {
        index: {
            largura: 1180,
            altura: 680,
            alturaMobile: 250
        },

        horizontal: {
            largura: 1200,
            altura: 100,
            alturaMobile: 250
        },

        '970x90': {
            largura: 970,
            altura: 90,
            larguraMobile: 300,
            alturaMobile: 100
        },

        '970x250': {
            largura: 970,
            altura: 250
        },

        '970x250x100': {
            largura: 970,
            altura: 250,
            alturaMobile: 100
        },

        '1260x100': {
            largura: 1260,
            altura: 100
        },

        '300x600': {
            largura: 300,
            altura: 600
        },

        '300x250': {
            largura: 300,
            altura: 250
        }
    };

    /*
     * Guarda o estilo original dos containers que precisarmos alterar.
     * Isso permite restaurar quando, por exemplo:
     *
     * desktop = 970x90
     * mobile  = 300x100
     *
     * ou qualquer outro formato que mude de altura.
     */
    const estilosOriginais = new WeakMap();
    const containersPorIframe = new WeakMap();

    function obterFormato(iframe) {
        const classe = Object.keys(formatos).find((formato) =>
            iframe.classList.contains(`previa-${formato}`)
        );

        if (classe) return classe;

        try {
            const arquivo = new URL(
                iframe.src,
                document.baseURI
            ).pathname.split('/').pop() || 'index.html';

            const formato = arquivo.replace(/\.html$/i, '');

            return Object.hasOwn(formatos, formato)
                ? formato
                : 'index';
        } catch {
            return 'index';
        }
    }

    function aplicarEstilo(elemento, propriedade, valor) {
        elemento.style.setProperty(
            propriedade,
            valor,
            'important'
        );
    }

    function salvarEstiloOriginal(elemento) {
        if (estilosOriginais.has(elemento)) return;

        const propriedades = [
            'height',
            'min-height',
            'max-height',
            'overflow',
            'overflow-x',
            'overflow-y'
        ];

        const original = {};

        propriedades.forEach((propriedade) => {
            original[propriedade] = {
                valor: elemento.style.getPropertyValue(propriedade),
                prioridade: elemento.style.getPropertyPriority(propriedade)
            };
        });

        estilosOriginais.set(elemento, original);
    }

    function restaurarEstiloOriginal(elemento) {
        const original = estilosOriginais.get(elemento);

        if (!original) return;

        Object.entries(original).forEach(
            ([propriedade, configuracao]) => {
                if (configuracao.valor) {
                    elemento.style.setProperty(
                        propriedade,
                        configuracao.valor,
                        configuracao.prioridade
                    );
                } else {
                    elemento.style.removeProperty(propriedade);
                }
            }
        );
    }

    function restaurarContainers(iframe) {
        const containers = containersPorIframe.get(iframe);

        if (!containers) return;

        containers.forEach((elemento) => {
            restaurarEstiloOriginal(elemento);
        });

        containersPorIframe.set(iframe, []);
    }

    /*
     * Procura automaticamente containers acima do iframe
     * que estejam menores que a altura necessária.
     *
     * Não depende de:
     *
     * .fundoBanner
     * .supperBanner
     * .propaganda
     *
     * ou qualquer classe específica do site cliente.
     */
    function ajustarContainers(iframe, alturaNecessaria) {
        const alterados =
            containersPorIframe.get(iframe) || [];

        let elemento = iframe.parentElement;
        let nivel = 0;

        while (
            elemento &&
            elemento !== document.body &&
            elemento !== document.documentElement &&
            nivel < MAX_NIVEIS_CONTAINER
        ) {
            const estilo = window.getComputedStyle(elemento);
            const rect = elemento.getBoundingClientRect();

            const alturaAtual = rect.height;

            /*
             * Há uma tolerância de 2px para evitar alterações
             * causadas apenas por arredondamentos do navegador.
             */
            const estaLimitando =
                alturaAtual + 2 < alturaNecessaria;

            if (estaLimitando) {
                salvarEstiloOriginal(elemento);

                /*
                 * Em vez de simplesmente colocar height:auto,
                 * garantimos fisicamente que exista espaço para
                 * o banner.
                 */
                aplicarEstilo(
                    elemento,
                    'height',
                    `${alturaNecessaria}px`
                );

                aplicarEstilo(
                    elemento,
                    'min-height',
                    `${alturaNecessaria}px`
                );

                /*
                 * Alguns sites usam max-height junto com height.
                 * Isso também pode cortar o banner.
                 */
                const maxHeight = parseFloat(estilo.maxHeight);

                if (
                    Number.isFinite(maxHeight) &&
                    maxHeight < alturaNecessaria
                ) {
                    aplicarEstilo(
                        elemento,
                        'max-height',
                        'none'
                    );
                }

                /*
                 * Se o site estiver cortando o conteúdo,
                 * liberamos somente nos containers que realmente
                 * são menores que o banner.
                 */
                if (
                    estilo.overflow === 'hidden' ||
                    estilo.overflow === 'clip' ||
                    estilo.overflowY === 'hidden' ||
                    estilo.overflowY === 'clip'
                ) {
                    aplicarEstilo(
                        elemento,
                        'overflow',
                        'visible'
                    );
                }

                if (!alterados.includes(elemento)) {
                    alterados.push(elemento);
                }
            }

            elemento = elemento.parentElement;
            nivel++;
        }

        containersPorIframe.set(
            iframe,
            alterados
        );
    }

    function calcularDimensoes(iframe, dimensoes) {
        const larguraDisponivel =
            iframe.parentElement?.getBoundingClientRect().width ||
            window.innerWidth;

        const limiteMobile =
            dimensoes.limiteMobile ||
            LIMITE_MOBILE;

        const mobile =
            Math.min(
                window.innerWidth,
                larguraDisponivel
            ) <= limiteMobile;

        return {
            mobile,

            largura:
                mobile && dimensoes.larguraMobile
                    ? dimensoes.larguraMobile
                    : dimensoes.largura,

            altura:
                mobile && dimensoes.alturaMobile
                    ? dimensoes.alturaMobile
                    : dimensoes.altura
        };
    }

    function ajustarIframe(iframe) {
        const formato = obterFormato(iframe);
        const dimensoes = formatos[formato];

        iframe.dataset.previaFormato = formato;

        iframe.scrolling = 'no';

        aplicarEstilo(
            iframe,
            'display',
            'block'
        );

        aplicarEstilo(
            iframe,
            'box-sizing',
            'border-box'
        );

        aplicarEstilo(
            iframe,
            'margin-inline',
            'auto'
        );

        aplicarEstilo(
            iframe,
            'padding',
            '0'
        );

        aplicarEstilo(
            iframe,
            'border',
            '0'
        );

        aplicarEstilo(
            iframe,
            'overflow',
            'hidden'
        );

        let ultimaAltura = null;
        let ultimaLargura = null;
        let framePendente = null;

        const atualizar = () => {
            if (framePendente) {
                cancelAnimationFrame(framePendente);
            }

            framePendente = requestAnimationFrame(() => {
                framePendente = null;

                const atual = calcularDimensoes(
                    iframe,
                    dimensoes
                );

                iframe.width = String(atual.largura);
                iframe.height = String(atual.altura);

                aplicarEstilo(
                    iframe,
                    'width',
                    `min(${atual.largura}px, 100%)`
                );

                aplicarEstilo(
                    iframe,
                    'max-width',
                    `${atual.largura}px`
                );

                aplicarEstilo(
                    iframe,
                    'height',
                    `${atual.altura}px`
                );

                /*
                 * Se mudou de desktop para mobile ou vice-versa,
                 * primeiro restauramos os containers para o estado
                 * original e recalculamos tudo.
                 */
                if (
                    ultimaAltura !== null &&
                    ultimaAltura !== atual.altura
                ) {
                    restaurarContainers(iframe);
                }

                ajustarContainers(
                    iframe,
                    atual.altura
                );

                ultimaAltura = atual.altura;
                ultimaLargura = atual.largura;
            });
        };

        atualizar();

        /*
         * ResizeObserver é melhor que depender apenas
         * do resize da janela porque o container pode mudar
         * sem o viewport mudar.
         */
        if ('ResizeObserver' in window) {
            const observador = new ResizeObserver(atualizar);

            observador.observe(
                iframe.parentElement || iframe
            );

            iframe._previaResizeObserver = observador;
        }

        window.addEventListener(
            'resize',
            atualizar,
            { passive: true }
        );

        iframe._previaAtualizar = atualizar;
    }

    function iniciar(raiz = document) {
        if (
            raiz.matches?.(SELETOR) &&
            !raiz.dataset.previaAjustada
        ) {
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
        document.addEventListener(
            'DOMContentLoaded',
            () => iniciar(),
            { once: true }
        );
    } else {
        iniciar();
    }

    /*
     * Continua funcionando caso o iframe seja inserido depois
     * por Ad Manager, JavaScript, AJAX etc.
     */
    if ('MutationObserver' in window) {
        new MutationObserver((mutacoes) => {
            mutacoes.forEach((mutacao) => {
                mutacao.addedNodes.forEach((no) => {
                    if (
                        no.nodeType ===
                        Node.ELEMENT_NODE
                    ) {
                        iniciar(no);
                    }
                });
            });
        }).observe(
            document.documentElement,
            {
                childList: true,
                subtree: true
            }
        );
    }
})();