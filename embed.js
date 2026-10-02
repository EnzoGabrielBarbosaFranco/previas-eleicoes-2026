(function () {
    'use strict';

    const TAG = 'previa-eleitoral-2026';
    // Usa a hospedagem do próprio script, inclusive quando mudar de provedor.
    // O fallback mantém compatibilidade com integrações que executam o código inline.
    const scriptAtual = document.currentScript;
    const BASE_URL = new URL('.', scriptAtual && scriptAtual.src
        ? scriptAtual.src
        : 'https://previas-eleicoes-2026.vercel.app/embed.js');

    /*
     * Breakpoint usado quando o cliente não informar
     * um breakpoint específico no componente.
     */
    const BREAKPOINT_PADRAO = 1050;

    const FORMATOS = {
        index: {
            desktop: {
                largura: 1180,
                altura: 680
            },
            mobile: {
                largura: '100%',
                altura: 250
            }
        },

        horizontal: {
            desktop: {
                largura: 1200,
                altura: 100
            },
            mobile: {
                largura: '100%',
                altura: 250
            }
        },

        '970x90': {
            desktop: {
                largura: 970,
                altura: 90
            },
            mobile: {
                largura: '100%',
                altura: 90
            }
        },

        '970x250': {
            desktop: {
                largura: 970,
                altura: 250
            },
            mobile: {
                largura: '100%',
                altura: 250
            }
        },

        '970x250x100': {
            desktop: {
                largura: 970,
                altura: 250
            },
            mobile: {
                largura: '100%',
                altura: 100
            }
        },

        '1260x100': {
            desktop: {
                largura: 1260,
                altura: 100
            },
            mobile: {
                largura: '100%',
                altura: 100
            }
        },

        '1260x200': {
            desktop: {
                largura: 1260,
                altura: 200
            },
            mobile: {
                largura: '100%',
                altura: 100
            }
        },

        '300x600': {
            desktop: {
                largura: 300,
                altura: 600
            },
            mobile: {
                largura: 300,
                altura: 600
            }
        },

        '300x250': {
            desktop: {
                largura: 300,
                altura: 250
            },
            mobile: {
                largura: 300,
                altura: 250
            }
        }
    };

    if (!('customElements' in window)) {
        return;
    }

    /*
     * Permite colocar o mesmo embed.js mais de uma
     * vez na página sem gerar erro.
     */
    if (customElements.get(TAG)) {
        return;
    }

    class PreviaEleitoral extends HTMLElement {
        constructor() {
            super();

            this._iframe = null;
            this._resizeTimer = null;

            this._resizeHandler = () => {
                this._agendarAjuste();
            };
        }

        /*
         * Podemos mudar formato e breakpoint
         * dinamicamente.
         */
        static get observedAttributes() {
            return [
                'formato',
                'breakpoint'
            ];
        }

        connectedCallback() {
            if (!this.shadowRoot) {
                this.attachShadow({
                    mode: 'open'
                });
            }

            this._renderizar();

            window.addEventListener(
                'resize',
                this._resizeHandler,
                {
                    passive: true
                }
            );

            this._ajustar();
        }

        disconnectedCallback() {
            window.removeEventListener(
                'resize',
                this._resizeHandler
            );

            if (this._resizeTimer) {
                clearTimeout(
                    this._resizeTimer
                );

                this._resizeTimer = null;
            }
        }

        attributeChangedCallback(
            nome,
            antigo,
            novo
        ) {
            if (
                antigo === novo ||
                !this.isConnected
            ) {
                return;
            }

            /*
             * Se mudou o formato precisamos
             * carregar outro HTML.
             */
            if (nome === 'formato') {
                this._renderizar();
            }

            /*
             * Se mudou apenas breakpoint,
             * basta recalcular dimensões.
             */
            this._ajustar();
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

        /*
         * O breakpoint agora pode ser escolhido
         * individualmente em cada cliente/banner:
         *
         * breakpoint="1050"
         * breakpoint="900"
         * breakpoint="768"
         *
         * Se não existir, usa 1050.
         */
        _obterBreakpoint() {
            const atributo =
                this.getAttribute(
                    'breakpoint'
                );

            if (!atributo) {
                return BREAKPOINT_PADRAO;
            }

            const breakpoint =
                Number(atributo);

            if (
                !Number.isFinite(breakpoint) ||
                breakpoint <= 0
            ) {
                return BREAKPOINT_PADRAO;
            }

            return breakpoint;
        }

        _obterUrl(formato) {
            return new URL(`${formato}.html`, BASE_URL).href;
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
                        margin-left: auto !important;
                        margin-right: auto !important;
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
                        scrolling="no">
                    </iframe>
                </div>
            `;

            this._iframe =
                this.shadowRoot.querySelector(
                    'iframe'
                );
        }

        _obterTamanho() {
            const formato =
                this._obterFormato();

            const config =
                FORMATOS[formato];

            const breakpoint =
                this._obterBreakpoint();

            /*
             * Única regra para desktop/mobile:
             *
             * viewport > breakpoint
             *     desktop
             *
             * viewport <= breakpoint
             *     mobile
             */
            const mobile =
                window.innerWidth <=
                breakpoint;

            const tamanho =
                mobile
                    ? config.mobile
                    : config.desktop;

            return {
                formato,
                breakpoint,
                mobile,
                largura:
                    tamanho.largura,
                altura:
                    tamanho.altura
            };
        }

        _ajustar() {
            if (
                !this.isConnected ||
                !this._iframe
            ) {
                return;
            }

            const tamanho =
                this._obterTamanho();

            /*
             * -------------------------
             * LARGURA
             * -------------------------
             */

            if (
                tamanho.largura ===
                '100%'
            ) {
                /*
                 * Versões fluidas:
                 *
                 * 970x250x100 mobile
                 * 1260x100 mobile
                 * horizontal mobile
                 * etc.
                 */
                this.style.setProperty(
                    'width',
                    '100%',
                    'important'
                );

                this.style.setProperty(
                    'max-width',
                    '100%',
                    'important'
                );

            } else {
                /*
                 * Medidas fixas:
                 *
                 * 970px
                 * 1260px
                 * 300px
                 * etc.
                 */
                this.style.setProperty(
                    'width',
                    `${tamanho.largura}px`,
                    'important'
                );

                /*
                 * Não deixa criar scroll horizontal
                 * caso o espaço físico seja menor.
                 */
                this.style.setProperty(
                    'max-width',
                    '100%',
                    'important'
                );
            }

            /*
             * -------------------------
             * ALTURA
             * -------------------------
             */

            this.style.setProperty(
                'height',
                `${tamanho.altura}px`,
                'important'
            );

            this.style.setProperty(
                'min-height',
                `${tamanho.altura}px`,
                'important'
            );

            this.style.setProperty(
                'max-height',
                `${tamanho.altura}px`,
                'important'
            );

            /*
             * -------------------------
             * IFRAME
             * -------------------------
             */

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
                'max-width',
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

            this._iframe.style.setProperty(
                'padding',
                '0',
                'important'
            );

            this._iframe.style.setProperty(
                'overflow',
                'hidden',
                'important'
            );

            /*
             * width/height HTML do iframe.
             *
             * Para largura fluida usamos a largura
             * física atual do componente.
             */
            const larguraReal =
                tamanho.largura === '100%'
                    ? Math.round(
                        this.getBoundingClientRect()
                            .width
                    )
                    : tamanho.largura;

            this._iframe.width =
                String(
                    Math.max(
                        1,
                        larguraReal
                    )
                );

            this._iframe.height =
                String(
                    tamanho.altura
                );

            /*
             * Informações úteis para inspecionar
             * pelo DevTools.
             */
            this.dataset.previaFormato =
                tamanho.formato;

            this.dataset.previaBreakpoint =
                String(
                    tamanho.breakpoint
                );

            this.dataset.previaModo =
                tamanho.mobile
                    ? 'mobile'
                    : 'desktop';

            this.dataset.previaLargura =
                String(
                    larguraReal
                );

            this.dataset.previaAltura =
                String(
                    tamanho.altura
                );
        }

        /*
         * Pequeno debounce para resize.
         *
         * Evita dezenas de ajustes enquanto
         * o usuário redimensiona a janela.
         */
        _agendarAjuste() {
            if (this._resizeTimer) {
                clearTimeout(
                    this._resizeTimer
                );
            }

            this._resizeTimer =
                setTimeout(() => {
                    this._resizeTimer = null;
                    this._ajustar();
                }, 40);
        }
    }

    customElements.define(
        TAG,
        PreviaEleitoral
    );
})();