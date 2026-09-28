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

    /*
     * Evita registrar o componente novamente caso o embed.js
     * seja incluído mais de uma vez na mesma página.
     */
    if (customElements.get(TAG)) {
        return;
    }

    class PreviaEleitoral extends HTMLElement {
        constructor() {
            super();

            this._iframe = null;
            this._resizeObserver = null;
            this._frame = null;

            this._ultimaLargura = null;
            this._ultimaAltura = null;
            this._ultimoMobile = null;

            /*
             * Containers externos do portal que precisaram
             * ser alterados pelo widget.
             */
            this._containersAlterados = new Map();

            this._resizeHandler = () => {
                this._agendarAjuste();
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
                    {
                        passive: true
                    }
                );

                this._observarContainer();

                /*
                 * Ajusta imediatamente e novamente no frame
                 * seguinte para pegar containers que ainda
                 * estejam sendo montados pelo portal.
                 */
                this._ajustar();
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

            if (this._frame) {
                cancelAnimationFrame(
                    this._frame
                );

                this._frame = null;
            }

            this._restaurarContainers();
        }

        attributeChangedCallback(
            nome,
            valorAntigo,
            valorNovo
        ) {
            if (
                nome !== 'formato' ||
                valorAntigo === valorNovo ||
                !this.isConnected
            ) {
                return;
            }

            this._restaurarContainers();

            this._ultimaLargura = null;
            this._ultimaAltura = null;
            this._ultimoMobile = null;

            this._renderizar();
            this._observarContainer();
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

        /*
         * O ponto mais importante:
         *
         * DESKTOP / MOBILE é definido pela viewport REAL
         * do site, e não pela largura atual do container.
         *
         * Isso impede:
         *
         * container 300px em desktop
         * -> iframe 300px
         * -> CSS interno pensa que é mobile
         */
        _calcularDimensoes() {
            const formato =
                this._obterFormato();

            const config =
                FORMATOS[formato];

            const larguraViewport =
                window.innerWidth;

            const larguraPai =
                this.parentElement
                    ?.getBoundingClientRect()
                    .width;

            const larguraDisponivel =
                larguraPai &&
                larguraPai > 0
                    ? larguraPai
                    : larguraViewport;

            const limiteMobile =
                config.limiteMobile ||
                LIMITE_MOBILE;

            /*
             * NÃO usar larguraDisponivel aqui.
             */
            const mobile =
                larguraViewport <=
                limiteMobile;

            let largura;
            let altura;
            let larguraFluida = false;

            if (mobile) {
                /*
                 * MOBILE
                 */
                altura =
                    Number.isFinite(
                        config.alturaMobile
                    )
                        ? config.alturaMobile
                        : config.altura;

                if (
                    config.larguraMobile ===
                    'disponivel'
                ) {
                    largura =
                        larguraDisponivel;

                    larguraFluida = true;

                } else if (
                    Number.isFinite(
                        config.larguraMobile
                    )
                ) {
                    largura = Math.min(
                        config.larguraMobile,
                        larguraDisponivel
                    );

                } else {
                    /*
                     * Exemplo:
                     * 970x250 não possui uma versão
                     * mobile diferente.
                     *
                     * Mantém altura 250 e apenas encaixa
                     * horizontalmente na tela.
                     */
                    largura = Math.min(
                        config.largura,
                        larguraDisponivel
                    );
                }

            } else {
                /*
                 * DESKTOP
                 *
                 * Não usamos a largura do container
                 * para transformar o anúncio em mobile.
                 *
                 * Só impedimos que ultrapasse fisicamente
                 * a própria viewport.
                 */
                largura = Math.min(
                    config.largura,
                    larguraViewport
                );

                altura =
                    config.altura;
            }

            return {
                formato,
                config,
                mobile,
                largura,
                altura,
                larguraDisponivel,
                larguraFluida
            };
        }

        _aplicarDimensoes(dimensoes) {
            if (!this._iframe) {
                return;
            }

            const largura = Math.max(
                1,
                Math.round(
                    dimensoes.largura
                )
            );

            const altura = Math.max(
                1,
                Math.round(
                    dimensoes.altura
                )
            );

            /*
             * HOST DO COMPONENTE
             */
            if (
                dimensoes.mobile &&
                dimensoes.larguraFluida
            ) {
                /*
                 * Exemplos:
                 *
                 * 970x250x100 mobile
                 * 1260x100 mobile
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
                 * IMPORTANTE:
                 *
                 * No desktop NÃO colocamos
                 * max-width:100%.
                 *
                 * Senão um container de 300px faria
                 * o iframe de 970px nascer com 300px.
                 */
                this.style.setProperty(
                    'width',
                    `${largura}px`,
                    'important'
                );

                if (dimensoes.mobile) {
                    this.style.setProperty(
                        'max-width',
                        '100%',
                        'important'
                    );
                } else {
                    this.style.setProperty(
                        'max-width',
                        'none',
                        'important'
                    );
                }
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
             * IFRAME INTERNO
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
                'none',
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
             * Se houve troca desktop/mobile ou mudança
             * real de tamanho, restaura primeiro o portal
             * e calcula tudo novamente.
             */
            const mudou =
                this._ultimaAltura !== null &&
                (
                    this._ultimaAltura !==
                        dimensoes.altura ||
                    this._ultimaLargura !==
                        dimensoes.largura ||
                    this._ultimoMobile !==
                        dimensoes.mobile
                );

            if (mudou) {
                this._restaurarContainers();
            }

            this._aplicarDimensoes(
                dimensoes
            );

            this._ajustarContainers(
                dimensoes.largura,
                dimensoes.altura,
                dimensoes.mobile
            );

            this._ultimaLargura =
                dimensoes.largura;

            this._ultimaAltura =
                dimensoes.altura;

            this._ultimoMobile =
                dimensoes.mobile;
        }

        _agendarAjuste() {
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
        }

        _observarContainer() {
            if (this._resizeObserver) {
                this._resizeObserver.disconnect();
                this._resizeObserver = null;
            }

            if (
                !('ResizeObserver' in window)
            ) {
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

        /*
         * Salva os estilos INLINE originais do cliente
         * antes de modificar qualquer container.
         */
        _salvarContainer(elemento) {
            if (
                this._containersAlterados.has(
                    elemento
                )
            ) {
                return;
            }

            const propriedades = [
                'width',
                'min-width',
                'max-width',

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
                    Object.entries(
                        estado
                    ).forEach(
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

        /*
         * Faz o equivalente genérico a:
         *
         * .fundoBanner
         * .supperBanner
         * .propaganda
         *
         * sem conhecer nenhuma classe do portal.
         */
        _ajustarContainers(
            larguraNecessaria,
            alturaNecessaria,
            mobile
        ) {
            let elemento =
                this.parentElement;

            let nivel = 0;

            while (
                elemento &&
                elemento !==
                    document.body &&
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

                const precisaAltura =
                    rect.height + 2 <
                    alturaNecessaria;

                /*
                 * ALTURA
                 *
                 * Esse é o principal comportamento
                 * que você precisava:
                 *
                 * container 100px
                 * banner 250px
                 * -> container passa para 250px
                 */
                if (precisaAltura) {
                    this._salvarContainer(
                        elemento
                    );

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
                        elemento.style.setProperty(
                            'max-height',
                            'none',
                            'important'
                        );
                    }
                }

                /*
                 * LARGURA
                 *
                 * Somente desktop.
                 *
                 * E somente se houver espaço no pai
                 * para suportar o banner.
                 *
                 * Isso evita aumentar indiscriminadamente
                 * qualquer coluna do site.
                 */
                if (!mobile) {
                    const pai =
                        elemento.parentElement;

                    const larguraPai =
                        pai &&
                        pai !== document.body &&
                        pai !==
                            document.documentElement
                            ? pai
                                .getBoundingClientRect()
                                .width
                            : window.innerWidth;

                    const podeExpandir =
                        larguraPai + 2 >=
                        larguraNecessaria;

                    const precisaLargura =
                        rect.width + 2 <
                        larguraNecessaria;

                    if (
                        precisaLargura &&
                        podeExpandir
                    ) {
                        this._salvarContainer(
                            elemento
                        );

                        elemento.style.setProperty(
                            'width',
                            `${larguraNecessaria}px`,
                            'important'
                        );

                        elemento.style.setProperty(
                            'min-width',
                            `${larguraNecessaria}px`,
                            'important'
                        );

                        const maxWidth =
                            parseFloat(
                                estilo.maxWidth
                            );

                        if (
                            Number.isFinite(
                                maxWidth
                            ) &&
                            maxWidth <
                                larguraNecessaria
                        ) {
                            elemento.style
                                .setProperty(
                                    'max-width',
                                    'none',
                                    'important'
                                );
                        }
                    }
                }

                /*
                 * Se o container está cortando o
                 * conteúdo que precisa crescer,
                 * libera o overflow.
                 */
                const overflowBloqueado =
                    estilo.overflow ===
                        'hidden' ||
                    estilo.overflow ===
                        'clip' ||
                    estilo.overflowX ===
                        'hidden' ||
                    estilo.overflowX ===
                        'clip' ||
                    estilo.overflowY ===
                        'hidden' ||
                    estilo.overflowY ===
                        'clip';

                if (
                    overflowBloqueado &&
                    (
                        precisaAltura ||
                        rect.width + 2 <
                            larguraNecessaria
                    )
                ) {
                    this._salvarContainer(
                        elemento
                    );

                    elemento.style.setProperty(
                        'overflow',
                        'visible',
                        'important'
                    );

                    elemento.style.setProperty(
                        'overflow-x',
                        'visible',
                        'important'
                    );

                    elemento.style.setProperty(
                        'overflow-y',
                        'visible',
                        'important'
                    );
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