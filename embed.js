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

            larguraRestrita: 'disponivel',
            alturaRestrita: 100,

            toleranciaRestrita: 20
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
            this._frame = null;
            this._tokenAjuste = 0;

            this._resizeHandler = () => {
                this._agendarAjuste();
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
                { passive: true }
            );

            this._observarContainers();

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
                cancelAnimationFrame(
                    this._frame
                );

                this._frame = null;
            }

            this._tokenAjuste++;
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

            return 'index';
        }

        _obterUrl(formato) {
            return `${BASE_URL}/${formato}.html`;
        }

        _renderizar() {
            const formato =
                this._obterFormato();

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
                        src="${this._obterUrl(formato)}"
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
            const ancestrais = [];

            let elemento =
                this.parentElement;

            let nivel = 0;

            while (
                elemento &&
                elemento !== document.body &&
                elemento !== document.documentElement &&
                nivel < MAX_NIVEIS
            ) {
                ancestrais.push(elemento);

                elemento =
                    elemento.parentElement;

                nivel++;
            }

            return ancestrais;
        }

        /*
         * Primeiro calculamos APENAS o tamanho natural
         * do banner.
         *
         * Não olhamos o container ainda.
         */
        _calcularTamanhoBase() {
            const formato =
                this._obterFormato();

            const config =
                FORMATOS[formato];

            const mobile =
                window.innerWidth <=
                (config.limiteMobile ||
                    LIMITE_MOBILE);

            let largura =
                config.largura;

            let altura =
                config.altura;

            if (mobile) {
                if (
                    config.larguraMobile ===
                    'disponivel'
                ) {
                    largura =
                        window.innerWidth;

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
             * Nunca ultrapassa fisicamente
             * o viewport.
             */
            largura =
                Math.min(
                    largura,
                    window.innerWidth
                );

            return {
                formato,
                config,
                mobile,
                largura,
                altura
            };
        }

        /*
         * Aplica o tamanho natural primeiro.
         *
         * Isso é essencial.
         *
         * Se o pai tiver height:auto,
         * ele vai crescer junto.
         *
         * Se estiver realmente travado em 100px,
         * continuará com 100px.
         */
        _aplicarTamanho(
            largura,
            altura,
            ocultar = false
        ) {
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
                'visibility',
                ocultar
                    ? 'hidden'
                    : 'visible',
                'important'
            );

            if (!this._iframe) {
                return;
            }

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
        }

        /*
         * Essa leitura acontece DEPOIS de o banner
         * ter recebido o tamanho natural.
         */
        _lerEspacoReal(
            larguraEsperada,
            alturaEsperada
        ) {
            const ancestrais =
                this._obterAncestrais();

            let larguraDisponivel =
                window.innerWidth;

            let alturaRestrita =
                null;

            let elementoRestritivo =
                null;

            for (
                const elemento
                of ancestrais
            ) {
                const rect =
                    elemento
                        .getBoundingClientRect();

                if (
                    rect.width > 0
                ) {
                    larguraDisponivel =
                        Math.min(
                            larguraDisponivel,
                            rect.width
                        );
                }

                /*
                 * Aqui está o ponto importante:
                 *
                 * O banner já está, por exemplo,
                 * com 250px.
                 *
                 * Se o container continua com 100px,
                 * significa que o portal realmente
                 * está limitando a área.
                 */
                if (
                    rect.height >= 40 &&
                    rect.height + 2 <
                        alturaEsperada
                ) {
                    alturaRestrita =
                        rect.height;

                    elementoRestritivo =
                        elemento;

                    break;
                }
            }

            return {
                largura:
                    Math.max(
                        1,
                        larguraDisponivel
                    ),

                alturaRestrita,

                elementoRestritivo
            };
        }

        _calcularTamanhoFinal(
            base,
            espaco
        ) {
            const {
                config,
                formato,
                mobile
            } = base;

            let largura =
                Math.min(
                    base.largura,
                    espaco.largura
                );

            let altura =
                base.altura;

            let modo =
                mobile
                    ? 'mobile'
                    : 'normal';

            /*
             * Caso especial:
             *
             * 970x250x100
             *
             * Se o portal continuar restrito
             * em aproximadamente 100px depois
             * de tentarmos 250px, usamos a
             * versão compacta.
             */
            if (
                !mobile &&
                Number.isFinite(
                    config.alturaRestrita
                ) &&
                Number.isFinite(
                    espaco.alturaRestrita
                )
            ) {
                const limite =
                    config.alturaRestrita +
                    (
                        config
                            .toleranciaRestrita ||
                        0
                    );

                if (
                    espaco.alturaRestrita <=
                    limite
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
             * 1260x100 já possui 100px
             * naturalmente.
             */
            if (
                formato ===
                '1260x100'
            ) {
                largura =
                    Math.min(
                        config.largura,
                        espaco.largura
                    );

                altura = 100;
            }

            /*
             * 970x250 normal:
             *
             * pode diminuir de largura,
             * mas não inventamos uma altura
             * compacta que não existe.
             */
            if (
                formato ===
                '970x250'
            ) {
                altura = 250;
            }

            return {
                largura:
                    Math.max(
                        1,
                        Math.round(largura)
                    ),

                altura:
                    Math.max(
                        1,
                        Math.round(altura)
                    ),

                modo
            };
        }

        /*
         * AJUSTE EM DUAS FASES
         *
         * 1. tamanho natural
         * 2. lê o portal
         */
        _ajustar() {
            if (
                !this.isConnected ||
                !this._iframe
            ) {
                return;
            }

            const token =
                ++this._tokenAjuste;

            const base =
                this._calcularTamanhoBase();

            /*
             * Primeiro colocamos o tamanho correto
             * do criativo.
             *
             * Ocultamos por um frame para evitar
             * piscada durante a medição.
             */
            this._aplicarTamanho(
                base.largura,
                base.altura,
                true
            );

            requestAnimationFrame(() => {
                if (
                    token !==
                        this._tokenAjuste ||
                    !this.isConnected
                ) {
                    return;
                }

                /*
                 * Um segundo frame garante que
                 * media queries/layout do portal
                 * já tenham sido recalculados.
                 */
                requestAnimationFrame(() => {
                    if (
                        token !==
                            this._tokenAjuste ||
                        !this.isConnected
                    ) {
                        return;
                    }

                    const espaco =
                        this._lerEspacoReal(
                            base.largura,
                            base.altura
                        );

                    const final =
                        this._calcularTamanhoFinal(
                            base,
                            espaco
                        );

                    this._aplicarTamanho(
                        final.largura,
                        final.altura,
                        false
                    );

                    this.dataset.previaModo =
                        final.modo;

                    this.dataset.previaLargura =
                        String(
                            final.largura
                        );

                    this.dataset.previaAltura =
                        String(
                            final.altura
                        );
                });
            });
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