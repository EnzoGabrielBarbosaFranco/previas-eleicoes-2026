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
            larguraRestrita: 'disponivel'
        },

        '1260x100': {
            largura: 1260,
            altura: 100,
            larguraMobile: 'disponivel',
            alturaMobile: 100,
            larguraRestrita: 'disponivel'
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
            this._frame = null;
            this._elementosObservados = [];
            this._ultimoEstado = null;

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

                this._observarContainers();

                this._ajustar();
                this._agendarAjuste();

            } catch (erro) {
                console.error(
                    '[Prévia Eleitoral] Erro ao iniciar widget:',
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

            this._elementosObservados = [];
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
                `[Prévia Eleitoral] Formato "${formato}" não existe. Usando "index".`
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
         * Descobre se um elemento possui uma altura realmente
         * imposta pelo CSS.
         *
         * Exemplo:
         *
         * @media (max-width:1050px) {
         *     .fundoBanner {
         *         height:100px;
         *     }
         * }
         *
         * Não importa o nome da classe.
         */
        _lerAlturaDeclarada(elemento) {
            if (!elemento) {
                return null;
            }

            const rect =
                elemento.getBoundingClientRect();

            if (
                !Number.isFinite(rect.height) ||
                rect.height <= 0
            ) {
                return null;
            }

            /*
             * CSS Typed OM consegue diferenciar:
             *
             * height:auto
             *
             * de:
             *
             * height:100px
             *
             * mesmo quando a regra veio de media query.
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

                    const maxHeight =
                        mapa.get('max-height');

                    const heightTexto =
                        height
                            ? String(height).trim()
                            : '';

                    const maxHeightTexto =
                        maxHeight
                            ? String(maxHeight).trim()
                            : '';

                    /*
                     * height explicitamente definido.
                     */
                    if (
                        heightTexto &&
                        heightTexto !== 'auto'
                    ) {
                        return rect.height;
                    }

                    /*
                     * max-height também pode estar
                     * limitando a área.
                     */
                    if (
                        maxHeightTexto &&
                        maxHeightTexto !== 'none'
                    ) {
                        const numero =
                            parseFloat(
                                maxHeightTexto
                            );

                        if (
                            Number.isFinite(numero) &&
                            numero > 0
                        ) {
                            return Math.min(
                                rect.height,
                                numero
                            );
                        }
                    }

                    return null;

                } catch (_) {
                    /*
                     * Cai no fallback abaixo.
                     */
                }
            }

            /*
             * FALLBACK
             *
             * Em navegadores sem CSS Typed OM usamos uma
             * verificação temporária.
             *
             * O próprio componente fica com altura zero
             * por um instante síncrono.
             *
             * Um container com height:auto tende a diminuir.
             * Um container com height:100px continua 100px.
             */
            const alturaOriginal =
                this.style.getPropertyValue(
                    'height'
                );

            const alturaPrioridade =
                this.style.getPropertyPriority(
                    'height'
                );

            const minOriginal =
                this.style.getPropertyValue(
                    'min-height'
                );

            const minPrioridade =
                this.style.getPropertyPriority(
                    'min-height'
                );

            const maxOriginal =
                this.style.getPropertyValue(
                    'max-height'
                );

            const maxPrioridade =
                this.style.getPropertyPriority(
                    'max-height'
                );

            this.style.setProperty(
                'height',
                '0px',
                'important'
            );

            this.style.setProperty(
                'min-height',
                '0px',
                'important'
            );

            this.style.setProperty(
                'max-height',
                '0px',
                'important'
            );

            const alturaTeste =
                elemento
                    .getBoundingClientRect()
                    .height;

            if (alturaOriginal) {
                this.style.setProperty(
                    'height',
                    alturaOriginal,
                    alturaPrioridade
                );
            } else {
                this.style.removeProperty(
                    'height'
                );
            }

            if (minOriginal) {
                this.style.setProperty(
                    'min-height',
                    minOriginal,
                    minPrioridade
                );
            } else {
                this.style.removeProperty(
                    'min-height'
                );
            }

            if (maxOriginal) {
                this.style.setProperty(
                    'max-height',
                    maxOriginal,
                    maxPrioridade
                );
            } else {
                this.style.removeProperty(
                    'max-height'
                );
            }

            /*
             * Ignora alturas muito pequenas que normalmente
             * são apenas padding/borda do container.
             */
            if (
                Number.isFinite(alturaTeste) &&
                alturaTeste >= 40
            ) {
                return alturaTeste;
            }

            return null;
        }

        /*
         * Lê o espaço real oferecido pelo portal.
         *
         * NÃO altera nenhuma classe.
         * NÃO adiciona width/height nos pais.
         * NÃO usa !important fora do próprio componente.
         */
        _lerEspacoDisponivel() {
            const ancestrais =
                this._obterAncestrais();

            let larguraDisponivel =
                window.innerWidth;

            let alturaLimitada = null;

            ancestrais.forEach(
                (elemento) => {
                    const rect =
                        elemento
                            .getBoundingClientRect();

                    if (
                        Number.isFinite(
                            rect.width
                        ) &&
                        rect.width > 0
                    ) {
                        larguraDisponivel =
                            Math.min(
                                larguraDisponivel,
                                rect.width
                            );
                    }

                    const alturaDeclarada =
                        this._lerAlturaDeclarada(
                            elemento
                        );

                    if (
                        Number.isFinite(
                            alturaDeclarada
                        ) &&
                        alturaDeclarada > 0
                    ) {
                        if (
                            alturaLimitada ===
                            null
                        ) {
                            alturaLimitada =
                                alturaDeclarada;
                        } else {
                            alturaLimitada =
                                Math.min(
                                    alturaLimitada,
                                    alturaDeclarada
                                );
                        }
                    }
                }
            );

            return {
                largura:
                    Math.max(
                        1,
                        larguraDisponivel
                    ),

                altura:
                    alturaLimitada
            };
        }

        _calcularDimensoes() {
            const formato =
                this._obterFormato();

            const config =
                FORMATOS[formato];

            const espaco =
                this._lerEspacoDisponivel();

            const limiteMobile =
                config.limiteMobile ||
                LIMITE_MOBILE;

            const mobilePorTela =
                window.innerWidth <=
                limiteMobile;

            let largura =
                config.largura;

            let altura =
                config.altura;

            let modo =
                'desktop';

            /*
             * MOBILE NORMAL
             */
            if (mobilePorTela) {
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
            }

            /*
             * LARGURA DO PORTAL
             *
             * Mesmo em desktop nunca ultrapassamos
             * fisicamente a área disponível.
             */
            largura =
                Math.min(
                    largura,
                    espaco.largura
                );

            /*
             * ALTURA IMPOSTA PELO PORTAL
             *
             * Esta regra tem prioridade.
             *
             * Exemplo:
             *
             * nosso banner:
             * 970x250
             *
             * portal:
             * height:100px
             *
             * resultado:
             * altura = 100px
             *
             * SEM alterar o portal.
             */
            if (
                Number.isFinite(
                    espaco.altura
                ) &&
                espaco.altura > 0 &&
                espaco.altura < altura
            ) {
                modo =
                    'restrito';

                altura =
                    espaco.altura;

                /*
                 * Alguns formatos possuem uma versão
                 * especificamente projetada para ocupar
                 * toda a largura quando a altura fica baixa.
                 */
                if (
                    config.larguraRestrita ===
                    'disponivel'
                ) {
                    largura =
                        espaco.largura;
                } else {
                    largura =
                        Math.min(
                            largura,
                            espaco.largura
                        );
                }
            }

            /*
             * 970x250x100
             *
             * Caso o portal imponha algo próximo de 100px,
             * o criativo passa naturalmente para 100px.
             *
             * Se o portal disser 90px, respeitamos 90.
             * Se disser 100px, respeitamos 100.
             */
            if (
                formato ===
                    '970x250x100' &&
                Number.isFinite(
                    espaco.altura
                ) &&
                espaco.altura > 0 &&
                espaco.altura <= 120
            ) {
                modo =
                    'compacto';

                largura =
                    espaco.largura;

                altura =
                    Math.min(
                        100,
                        espaco.altura
                    );
            }

            /*
             * 1260x100
             *
             * Altura já é naturalmente 100px.
             * A largura apenas respeita a área disponível.
             */
            if (
                formato ===
                '1260x100'
            ) {
                altura =
                    Number.isFinite(
                        espaco.altura
                    ) &&
                    espaco.altura > 0 &&
                    espaco.altura < 100
                        ? espaco.altura
                        : 100;

                largura =
                    Math.min(
                        1260,
                        espaco.largura
                    );

                if (
                    mobilePorTela ||
                    largura < 1260
                ) {
                    modo =
                        'compacto';
                }
            }

            largura =
                Math.max(
                    1,
                    Math.round(largura)
                );

            altura =
                Math.max(
                    1,
                    Math.round(altura)
                );

            return {
                formato,
                modo,
                mobile:
                    mobilePorTela,
                largura,
                altura,
                espaco
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

            /*
             * Toda alteração acontece APENAS
             * no nosso componente.
             *
             * Nada é aplicado no site cliente.
             */
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

            this.dataset.previaModo =
                modo;

            this.dataset.previaLargura =
                String(largura);

            this.dataset.previaAltura =
                String(altura);

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
                '100%',
                'important'
            );

            this._iframe.style.setProperty(
                'max-width',
                '100%',
                'important'
            );

            this._iframe.style.setProperty(
                'max-height',
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
             * Evita aplicar os mesmos estilos
             * repetidamente pelo ResizeObserver.
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

        /*
         * Observamos todos os containers próximos.
         *
         * Assim, se uma media query do portal mudar:
         *
         * height:250px
         *
         * para:
         *
         * height:100px
         *
         * o banner recalcula automaticamente.
         */
        _observarContainers() {
            if (this._resizeObserver) {
                this._resizeObserver.disconnect();
                this._resizeObserver = null;
            }

            this._elementosObservados =
                this._obterAncestrais();

            if (
                !('ResizeObserver' in window)
            ) {
                return;
            }

            this._resizeObserver =
                new ResizeObserver(() => {
                    this._agendarAjuste();
                });

            this._elementosObservados
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