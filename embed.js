(function () {
    'use strict';

    const TAG = 'previa-eleitoral-2026';
    const BASE_URL = 'https://previas-eleicoes-2026.vercel.app';

    const LIMITE_MOBILE = 760;
    const MAX_NIVEIS_CONTAINER = 5;

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
            alturaMobile: 100
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

    if (customElements.get(TAG)) {
        return;
    }

    class PreviaEleitoral extends HTMLElement {
        constructor() {
            super();

            this.attachShadow({ mode: 'open' });

            this._iframe = null;
            this._resizeObserver = null;
            this._resizeHandler = () => this._agendarAjuste();
            this._frame = null;

            this._ultimaAltura = null;
            this._ultimoFormato = null;

            /*
             * Elementos externos que nosso widget precisou alterar.
             *
             * Map em vez de WeakMap porque precisamos percorrer
             * depois para restaurar.
             */
            this._containersAlterados = new Map();
        }

        static get observedAttributes() {
            return ['formato'];
        }

        connectedCallback() {
            this._renderizar();

            window.addEventListener(
                'resize',
                this._resizeHandler,
                { passive: true }
            );

            this._observarContainer();

            this._agendarAjuste();
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

            if (this._frame) {
                cancelAnimationFrame(this._frame);
                this._frame = null;
            }

            this._restaurarContainers();
        }

        attributeChangedCallback(nome, antigo, novo) {
            if (
                nome === 'formato' &&
                antigo !== novo &&
                this.isConnected
            ) {
                this._restaurarContainers();

                this._ultimaAltura = null;
                this._ultimoFormato = null;

                this._renderizar();
                this._observarContainer();
                this._agendarAjuste();
            }
        }

        _obterFormato() {
            const formato =
                this.getAttribute('formato') || 'index';

            return Object.hasOwn(FORMATOS, formato)
                ? formato
                : 'index';
        }

        _obterUrl(formato) {
            if (formato === 'index') {
                return `${BASE_URL}/index.html`;
            }

            return `${BASE_URL}/${formato}.html`;
        }

        _renderizar() {
            const formato = this._obterFormato();
            const src = this._obterUrl(formato);

            this.shadowRoot.innerHTML = `
                <style>
                    :host {
                        display: block;
                        box-sizing: border-box;
                        margin-left: auto;
                        margin-right: auto;
                        padding: 0;
                        border: 0;
                    }

                    .previa-wrapper {
                        display: block;
                        width: 100%;
                        height: 100%;
                        margin: 0 auto;
                        padding: 0;
                        border: 0;
                        overflow: hidden;
                    }

                    iframe {
                        display: block;
                        width: 100%;
                        height: 100%;
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
                this.shadowRoot.querySelector('iframe');

            this._ultimoFormato = formato;
        }

        _observarContainer() {
            if (this._resizeObserver) {
                this._resizeObserver.disconnect();
            }

            if (!('ResizeObserver' in window)) {
                return;
            }

            this._resizeObserver =
                new ResizeObserver(() => {
                    this._agendarAjuste();
                });

            if (this.parentElement) {
                this._resizeObserver.observe(
                    this.parentElement
                );
            }
        }

        _agendarAjuste() {
            if (this._frame) {
                cancelAnimationFrame(this._frame);
            }

            this._frame = requestAnimationFrame(() => {
                this._frame = null;
                this._ajustar();
            });
        }

        _calcularDimensoes() {
            const formato = this._obterFormato();
            const config = FORMATOS[formato];

            const larguraViewport =
                window.innerWidth;

            const larguraContainer =
                this.parentElement
                    ?.getBoundingClientRect()
                    .width || larguraViewport;

            /*
             * Consideramos mobile tanto pela viewport quanto
             * pelo espaço real onde o widget foi colocado.
             */
            const larguraReferencia = Math.min(
                larguraViewport,
                larguraContainer
            );

            const limite =
                config.limiteMobile ||
                LIMITE_MOBILE;

            const mobile =
                larguraReferencia <= limite;

            let largura = config.largura;
            let altura = config.altura;
            let larguraFluida = false;

            if (mobile) {
                if (
                    config.larguraMobile ===
                    'disponivel'
                ) {
                    largura =
                        larguraContainer;

                    larguraFluida = true;
                } else if (
                    Number.isFinite(
                        config.larguraMobile
                    )
                ) {
                    largura =
                        config.larguraMobile;
                }

                if (
                    Number.isFinite(
                        config.alturaMobile
                    )
                ) {
                    altura =
                        config.alturaMobile;
                }
            }

            /*
             * Mesmo formatos desktop nunca podem ultrapassar
             * fisicamente o container onde foram colocados.
             */
            largura = Math.min(
                largura,
                larguraContainer
            );

            return {
                formato,
                mobile,
                largura,
                altura,
                larguraContainer,
                larguraFluida
            };
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

            /*
             * Caso a altura tenha mudado, por exemplo:
             *
             * 970x250x100:
             * desktop = 250
             * mobile  = 100
             *
             * restauramos primeiro o CSS original do portal.
             */
            if (
                this._ultimaAltura !== null &&
                this._ultimaAltura !==
                    dimensoes.altura
            ) {
                this._restaurarContainers();
            }

            this._aplicarDimensoes(dimensoes);

            this._ajustarContainers(
                dimensoes.altura
            );

            this._ultimaAltura =
                dimensoes.altura;
        }

        _aplicarDimensoes(dimensoes) {
            const largura =
                Math.max(
                    1,
                    Math.round(dimensoes.largura)
                );

            const altura =
                Math.max(
                    1,
                    Math.round(dimensoes.altura)
                );

            /*
             * HOST
             */
            if (dimensoes.larguraFluida) {
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
                this.style.setProperty(
                    'width',
                    `min(${largura}px, 100%)`,
                    'important'
                );

                this.style.setProperty(
                    'max-width',
                    `${largura}px`,
                    'important'
                );
            }

            this.style.setProperty(
                'height',
                `${altura}px`,
                'important'
            );

            this.style.setProperty(
                'min-height',
                `${altura}px`,
                'important'
            );

            this.style.setProperty(
                'box-sizing',
                'border-box',
                'important'
            );

            this.style.setProperty(
                'margin-inline',
                'auto',
                'important'
            );

            /*
             * IFRAME
             */
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
                `${altura}px`,
                'important'
            );

            this._iframe.style.setProperty(
                'max-width',
                '100%',
                'important'
            );
        }

        _salvarContainer(elemento) {
            if (
                this._containersAlterados.has(
                    elemento
                )
            ) {
                return;
            }

            const propriedades = [
                'height',
                'min-height',
                'max-height',
                'overflow',
                'overflow-x',
                'overflow-y'
            ];

            const estado = {};

            propriedades.forEach(
                (propriedade) => {
                    estado[propriedade] = {
                        valor:
                            elemento.style
                                .getPropertyValue(
                                    propriedade
                                ),

                        prioridade:
                            elemento.style
                                .getPropertyPriority(
                                    propriedade
                                )
                    };
                }
            );

            this._containersAlterados.set(
                elemento,
                estado
            );
        }

        _restaurarContainers() {
            this._containersAlterados.forEach(
                (estado, elemento) => {
                    Object.entries(estado).forEach(
                        ([
                            propriedade,
                            configuracao
                        ]) => {
                            if (
                                configuracao.valor
                            ) {
                                elemento.style
                                    .setProperty(
                                        propriedade,
                                        configuracao.valor,
                                        configuracao.prioridade
                                    );
                            } else {
                                elemento.style
                                    .removeProperty(
                                        propriedade
                                    );
                            }
                        }
                    );
                }
            );

            this._containersAlterados.clear();
        }

        _ajustarContainers(
            alturaNecessaria
        ) {
            let elemento =
                this.parentElement;

            let nivel = 0;

            while (
                elemento &&
                elemento !== document.body &&
                elemento !==
                    document.documentElement &&
                nivel <
                    MAX_NIVEIS_CONTAINER
            ) {
                const rect =
                    elemento
                        .getBoundingClientRect();

                const estilo =
                    window.getComputedStyle(
                        elemento
                    );

                const alturaAtual =
                    rect.height;

                /*
                 * Só toca em containers que realmente
                 * estejam menores que nosso anúncio.
                 */
                if (
                    alturaAtual + 2 <
                    alturaNecessaria
                ) {
                    this._salvarContainer(
                        elemento
                    );

                    /*
                     * Esse é o equivalente genérico ao:
                     *
                     * .fundoBanner {
                     *     height:250px !important
                     * }
                     *
                     * Só que sem saber o nome da classe.
                     */
                    elemento.style.setProperty(
                        'height',
                        `${alturaNecessaria}px`,
                        'important'
                    );

                    elemento.style.setProperty(
                        'min-height',
                        `${alturaNecessaria}px`,
                        'important'
                    );

                    /*
                     * Remove possíveis travas extras.
                     */
                    const maxHeight =
                        parseFloat(
                            estilo.maxHeight
                        );

                    if (
                        Number.isFinite(
                            maxHeight
                        ) &&
                        maxHeight <
                            alturaNecessaria
                    ) {
                        elemento.style
                            .setProperty(
                                'max-height',
                                'none',
                                'important'
                            );
                    }

                    const overflowBloqueado =
                        estilo.overflow ===
                            'hidden' ||
                        estilo.overflow ===
                            'clip' ||
                        estilo.overflowY ===
                            'hidden' ||
                        estilo.overflowY ===
                            'clip';

                    if (overflowBloqueado) {
                        elemento.style
                            .setProperty(
                                'overflow',
                                'visible',
                                'important'
                            );
                    }
                }

                elemento =
                    elemento.parentElement;

                nivel++;
            }
        }
    }

    customElements.define(
        TAG,
        PreviaEleitoral
    );
})();