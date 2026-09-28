(function () {
    'use strict';

    const TAG = 'previa-eleitoral-2026';
    const BASE_URL = 'https://previas-eleicoes-2026.vercel.app';

    const LIMITE_MOBILE = 760;
    const MAX_NIVEIS = 6;

    const FORMATOS = {
        index: {
            largura: 1180,
            altura: 680,
            larguraMobile: 'disponivel',
            alturaMobile: 250
        },

        horizontal: {
            largura: 1200,
            altura: 100,
            larguraMobile: 'disponivel',
            alturaMobile: 250
        },

        '970x90': {
            largura: 970,
            altura: 90,
            larguraMobile: 300,
            alturaMobile: 250
        },

        '970x250': {
            largura: 970,
            altura: 250
        },

        '970x250x100': {
            largura: 970,
            altura: 250,

            larguraMobile: 'disponivel',
            alturaMobile: 100,

            /*
             * Esse formato possui uma versão real
             * preparada para trabalhar em 100px.
             */
            alturaRestrita: 100,
            larguraRestrita: 'disponivel'
        },

        '1260x100': {
            largura: 1260,
            altura: 100,
            larguraMobile: 'disponivel',
            alturaMobile: 100
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

    if (!('customElements' in window)) {
        return;
    }

    if (customElements.get(TAG)) {
        return;
    }

    class PreviaEleitoral extends HTMLElement {
        constructor() {
            super();

            this._iframe = null;
            this._resizeObserver = null;
            this._resizeTimer = null;
            this._frame = null;

            this._ultimoEstado = null;

            this._resizeHandler = () => {
                this._agendarAjuste(80);
            };
        }

        static get observedAttributes() {
            return ['formato'];
        }

        connectedCallback() {
            try {
                if (!this.shadowRoot) {
                    this.attachShadow({
                        mode: 'open'
                    });
                }

                this._renderizar();

                window.addEventListener(
                    'resize',
                    this._resizeHandler,
                    { passive: true }
                );

                this._observarContainers();

                this._agendarAjuste();

            } catch (erro) {
                console.error(
                    '[Prévia Eleitoral] Erro ao iniciar:',
                    erro
                );
            }
        }

        disconnectedCallback() {
            window.removeEventListener(
                'resize',
                this._resizeHandler
            );

            if (this._resizeObserver) {
                this._resizeObserver.disconnect();
                this._resizeObserver = null;
            }

            if (this._resizeTimer) {
                clearTimeout(
                    this._resizeTimer
                );

                this._resizeTimer = null;
            }

            if (this._frame) {
                cancelAnimationFrame(
                    this._frame
                );

                this._frame = null;
            }
        }

        attributeChangedCallback(
            nome,
            antigo,
            novo
        ) {
            if (
                nome !== 'formato' ||
                antigo === novo ||
                !this.isConnected
            ) {
                return;
            }

            this._ultimoEstado = null;

            this._renderizar();
            this._observarContainers();
            this._agendarAjuste();
        }

        _obterFormato() {
            const formato =
                this.getAttribute('formato') ||
                'index';

            if (
                Object.prototype.hasOwnProperty.call(
                    FORMATOS,
                    formato
                )
            ) {
                return formato;
            }

            console.warn(
                `[Prévia Eleitoral] Formato "${formato}" não encontrado. Usando "index".`
            );

            return 'index';
        }

        _obterUrl(formato) {
            return `${BASE_URL}/${formato}.html`;
        }

        _renderizar() {
            if (!this.shadowRoot) {
                return;
            }

            const formato =
                this._obterFormato();

            const src =
                this._obterUrl(formato);

            this.shadowRoot.innerHTML = `
                <style>
                    :host {
                        display: block !important;
                        box-sizing: border-box !important;
                        margin: 0 auto !important;
                        padding: 0 !important;
                        border: 0 !important;
                        overflow: hidden !important;
                    }

                    .previa-wrapper {
                        display: block;
                        width: 100%;
                        height: 100%;
                        box-sizing: border-box;
                        margin: 0;
                        padding: 0;
                        border: 0;
                        overflow: hidden;
                    }

                    iframe {
                        display: block;
                        width: 100%;
                        height: 100%;
                        box-sizing: border-box;
                        margin: 0;
                        padding: 0;
                        border: 0;
                        overflow: hidden;
                    }
                </style>

                <div class="previa-wrapper">
                    <iframe
                        src="${src}"
                        title="Prévia adaptativa das Eleições 2026"
                        loading="lazy"
                        scrolling="no"
                    ></iframe>
                </div>
            `;

            this._iframe =
                this.shadowRoot.querySelector(
                    'iframe'
                );
        }

        _obterAncestrais() {
            const elementos = [];

            let elemento =
                this.parentElement;

            let nivel = 0;

            while (
                elemento &&
                elemento !== document.body &&
                elemento !== document.documentElement &&
                nivel < MAX_NIVEIS
            ) {
                elementos.push(elemento);

                elemento =
                    elemento.parentElement;

                nivel++;
            }

            return elementos;
        }

        /*
         * Tenta descobrir se o elemento possui
         * height explicitamente definido pelo CSS.
         *
         * Exemplo:
         *
         * @media (max-width:1050px) {
         *     .fundoBanner {
         *         height:100px;
         *     }
         * }
         *
         * Não precisamos saber que a classe se chama
         * fundoBanner.
         */
        _obterAlturaCSS(elemento) {
            if (!elemento) {
                return null;
            }

            /*
             * Chrome / Edge modernos.
             *
             * Essa é a melhor maneira porque conseguimos
             * diferenciar:
             *
             * height:auto
             *
             * de:
             *
             * height:100px
             */
            if (
                typeof elemento.computedStyleMap ===
                'function'
            ) {
                try {
                    const mapa =
                        elemento.computedStyleMap();

                    const height =
                        mapa.get('height');

                    if (height) {
                        const texto =
                            String(height)
                                .trim()
                                .toLowerCase();

                        if (
                            texto &&
                            texto !== 'auto' &&
                            texto !== 'none'
                        ) {
                            if (
                                typeof height.value ===
                                    'number' &&
                                height.unit === 'px'
                            ) {
                                return height.value;
                            }

                            const numero =
                                parseFloat(texto);

                            if (
                                Number.isFinite(numero)
                            ) {
                                return numero;
                            }
                        }
                    }

                    const maxHeight =
                        mapa.get('max-height');

                    if (maxHeight) {
                        const texto =
                            String(maxHeight)
                                .trim()
                                .toLowerCase();

                        if (
                            texto &&
                            texto !== 'none' &&
                            texto !== 'auto'
                        ) {
                            if (
                                typeof maxHeight.value ===
                                    'number' &&
                                maxHeight.unit === 'px'
                            ) {
                                return maxHeight.value;
                            }

                            const numero =
                                parseFloat(texto);

                            if (
                                Number.isFinite(numero)
                            ) {
                                return numero;
                            }
                        }
                    }

                } catch (_) {}
            }

            /*
             * Fallback para height inline.
             */
            const inline =
                elemento.style
                    .getPropertyValue(
                        'height'
                    )
                    .trim();

            if (
                inline &&
                inline !== 'auto'
            ) {
                const numero =
                    parseFloat(inline);

                if (
                    Number.isFinite(numero)
                ) {
                    return numero;
                }
            }

            /*
             * Outro fallback importante:
             *
             * container pequeno + overflow escondido
             * normalmente indica uma área realmente
             * limitada pelo portal.
             */
            const estilo =
                window.getComputedStyle(
                    elemento
                );

            const rect =
                elemento
                    .getBoundingClientRect();

            const overflowLimitado =
                estilo.overflow === 'hidden' ||
                estilo.overflow === 'clip' ||
                estilo.overflowY === 'hidden' ||
                estilo.overflowY === 'clip';

            if (
                overflowLimitado &&
                rect.height >= 40
            ) {
                return rect.height;
            }

            return null;
        }

        _lerEspaco() {
            const ancestrais =
                this._obterAncestrais();

            let largura =
                window.innerWidth;

            let alturaRestrita =
                null;

            for (
                const elemento
                of ancestrais
            ) {
                const rect =
                    elemento
                        .getBoundingClientRect();

                if (
                    Number.isFinite(
                        rect.width
                    ) &&
                    rect.width > 0
                ) {
                    largura =
                        Math.min(
                            largura,
                            rect.width
                        );
                }

                const alturaCSS =
                    this._obterAlturaCSS(
                        elemento
                    );

                if (
                    Number.isFinite(
                        alturaCSS
                    ) &&
                    alturaCSS >= 40
                ) {
                    if (
                        alturaRestrita ===
                        null
                    ) {
                        alturaRestrita =
                            alturaCSS;
                    } else {
                        alturaRestrita =
                            Math.min(
                                alturaRestrita,
                                alturaCSS
                            );
                    }
                }
            }

            return {
                largura:
                    Math.max(
                        1,
                        largura
                    ),

                alturaRestrita
            };
        }

        _calcularDimensoes() {
            const formato =
                this._obterFormato();

            const config =
                FORMATOS[formato];

            const espaco =
                this._lerEspaco();

            const limiteMobile =
                config.limiteMobile ||
                LIMITE_MOBILE;

            const mobile =
                window.innerWidth <=
                limiteMobile;

            let largura =
                config.largura;

            let altura =
                config.altura;

            let modo =
                'normal';

            /*
             * MOBILE DEFINIDO PELO FORMATO.
             */
            if (mobile) {
                modo =
                    'mobile';

                if (
                    config.larguraMobile ===
                    'disponivel'
                ) {
                    largura =
                        espaco.largura;

                } else if (
                    Number.isFinite(
                        config.larguraMobile
                    )
                ) {
                    largura =
                        Math.min(
                            config.larguraMobile,
                            espaco.largura
                        );

                } else {
                    largura =
                        Math.min(
                            config.largura,
                            espaco.largura
                        );
                }

                if (
                    Number.isFinite(
                        config.alturaMobile
                    )
                ) {
                    altura =
                        config.alturaMobile;
                }
            } else {
                /*
                 * DESKTOP.
                 *
                 * Apenas respeitamos a largura física
                 * disponível.
                 */
                largura =
                    Math.min(
                        config.largura,
                        espaco.largura
                    );
            }

            /*
             * CONTAINER COM ALTURA RESTRITA.
             *
             * Só entra aqui se esse formato tiver
             * uma versão preparada especificamente
             * para altura reduzida.
             *
             * Atualmente: 970x250x100.
             */
            if (
                Number.isFinite(
                    config.alturaRestrita
                ) &&
                Number.isFinite(
                    espaco.alturaRestrita
                ) &&
                espaco.alturaRestrita <
                    config.altura
            ) {
                /*
                 * Exemplo:
                 *
                 * formato = 970x250x100
                 * natural = 250
                 * portal  = 100
                 */
                if (
                    espaco.alturaRestrita <=
                    config.alturaRestrita + 20
                ) {
                    modo =
                        'restrito';

                    altura =
                        Math.min(
                            config.alturaRestrita,
                            espaco.alturaRestrita
                        );

                    if (
                        config.larguraRestrita ===
                        'disponivel'
                    ) {
                        largura =
                            espaco.largura;
                    }
                }
            }

            /*
             * 1260x100 sempre possui 100px.
             */
            if (
                formato ===
                '1260x100'
            ) {
                altura = 100;

                largura =
                    Math.min(
                        1260,
                        espaco.largura
                    );
            }

            return {
                formato,
                modo,

                largura:
                    Math.max(
                        1,
                        Math.round(largura)
                    ),

                altura:
                    Math.max(
                        1,
                        Math.round(altura)
                    )
            };
        }

        _aplicarDimensoes(
            dimensoes
        ) {
            if (!this._iframe) {
                return;
            }

            const {
                largura,
                altura,
                modo
            } = dimensoes;

            this.style.setProperty(
                'width',
                `${largura}px`,
                'important'
            );

            this.style.setProperty(
                'max-width',
                '100%',
                'important'
            );

            this.style.setProperty(
                'height',
                `${altura}px`,
                'important'
            );

            this.style.setProperty(
                'min-height',
                '0',
                'important'
            );

            this.style.setProperty(
                'max-height',
                `${altura}px`,
                'important'
            );

            this.style.setProperty(
                'overflow',
                'hidden',
                'important'
            );

            /*
             * Não usamos visibility:hidden.
             * Não alteramos para 250 e depois voltamos.
             *
             * Portanto não existe a piscada da versão
             * anterior.
             */
            this.style.removeProperty(
                'visibility'
            );

            this._iframe.width =
                String(largura);

            this._iframe.height =
                String(altura);

            this._iframe.style.setProperty(
                'width',
                '100%',
                'important'
            );

            this._iframe.style.setProperty(
                'height',
                '100%',
                'important'
            );

            this._iframe.style.setProperty(
                'border',
                '0',
                'important'
            );

            this._iframe.style.setProperty(
                'margin',
                '0',
                'important'
            );

            this.dataset.previaModo =
                modo;

            this.dataset.previaLargura =
                String(largura);

            this.dataset.previaAltura =
                String(altura);
        }

        _ajustar() {
            if (
                !this.isConnected ||
                !this._iframe
            ) {
                return;
            }

            const dimensoes =
                this._calcularDimensoes();

            const assinatura =
                [
                    dimensoes.formato,
                    dimensoes.modo,
                    dimensoes.largura,
                    dimensoes.altura
                ].join('|');

            /*
             * Fundamental para evitar loop com
             * ResizeObserver.
             */
            if (
                assinatura ===
                this._ultimoEstado
            ) {
                return;
            }

            this._ultimoEstado =
                assinatura;

            this._aplicarDimensoes(
                dimensoes
            );
        }

        _agendarAjuste(atraso = 0) {
            if (this._resizeTimer) {
                clearTimeout(
                    this._resizeTimer
                );

                this._resizeTimer = null;
            }

            const executar = () => {
                if (this._frame) {
                    cancelAnimationFrame(
                        this._frame
                    );
                }

                this._frame =
                    requestAnimationFrame(() => {
                        this._frame = null;
                        this._ajustar();
                    });
            };

            if (atraso > 0) {
                this._resizeTimer =
                    setTimeout(
                        executar,
                        atraso
                    );
            } else {
                executar();
            }
        }

        _observarContainers() {
            if (this._resizeObserver) {
                this._resizeObserver.disconnect();
                this._resizeObserver = null;
            }

            if (
                !('ResizeObserver' in window)
            ) {
                return;
            }

            /*
             * Podemos voltar a observar os containers
             * porque agora a medição NÃO muda
             * temporariamente o tamanho do banner.
             */
            this._resizeObserver =
                new ResizeObserver(() => {
                    this._agendarAjuste();
                });

            this._obterAncestrais()
                .forEach(
                    (elemento) => {
                        try {
                            this._resizeObserver
                                .observe(
                                    elemento
                                );
                        } catch (_) {}
                    }
                );
        }
    }

    customElements.define(
        TAG,
        PreviaEleitoral
    );
})();