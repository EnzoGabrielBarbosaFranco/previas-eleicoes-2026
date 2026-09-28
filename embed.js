(function () {
    'use strict';

    const TAG = 'previa-eleitoral-2026';
    const BASE_URL = 'https://previas-eleicoes-2026.vercel.app';
    const BREAKPOINT = 1050;

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
                largura: 300,
                altura: 250
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

    if (customElements.get(TAG)) {
        return;
    }

    class PreviaEleitoral extends HTMLElement {
        constructor() {
            super();

            this._iframe = null;

            this._resizeHandler = () => {
                this._ajustar();
            };
        }

        static get observedAttributes() {
            return ['formato'];
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

            this._renderizar();
            this._ajustar();
        }

        _obterFormato() {
            const formato =
                this.getAttribute('formato') ||
                'index';

            return Object.prototype.hasOwnProperty.call(
                FORMATOS,
                formato
            )
                ? formato
                : 'index';
        }

        _renderizar() {
            const formato =
                this._obterFormato();

            const src =
                `${BASE_URL}/${formato}.html`;

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

        _ajustar() {
            if (!this._iframe) {
                return;
            }

            const formato =
                this._obterFormato();

            const config =
                FORMATOS[formato];

            const mobile =
                window.innerWidth <=
                BREAKPOINT;

            const tamanho =
                mobile
                    ? config.mobile
                    : config.desktop;

            let largura;

            if (
                tamanho.largura === '100%'
            ) {
                largura = '100%';
            } else {
                largura =
                    `${tamanho.largura}px`;
            }

            /*
             * COMPONENTE
             */
            this.style.setProperty(
                'width',
                largura,
                'important'
            );

            this.style.setProperty(
                'max-width',
                '100%',
                'important'
            );

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

            /*
             * IFRAME
             */
            this._iframe.style.setProperty(
                'width',
                '100%',
                'important'
            );

            this._iframe.style.setProperty(
                'height',
                `${tamanho.altura}px`,
                'important'
            );

            this._iframe.style.setProperty(
                'max-width',
                '100%',
                'important'
            );

            this._iframe.width =
                tamanho.largura === '100%'
                    ? '100%'
                    : String(
                        tamanho.largura
                    );

            this._iframe.height =
                String(
                    tamanho.altura
                );

            this.dataset.previaModo =
                mobile
                    ? 'mobile'
                    : 'desktop';
        }
    }

    customElements.define(
        TAG,
        PreviaEleitoral
    );
})();