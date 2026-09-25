(function () {
    'use strict';

    const configuracaoBase = window.PREVIA_ELEITORAL_CONFIG;
    const raiz = document.getElementById('previa-widget');
    if (!configuracaoBase || !raiz) return;

    const configuracao = JSON.parse(JSON.stringify(configuracaoBase));
    const parametros = new URLSearchParams(window.location.search);
    const formato = document.body.dataset.formato || 'index';

    aplicarParametrosDaUrl();
    aplicarTema();

    const estado = {
        pagina: normalizarPagina(parametros.get('view') || configuracao.interface.paginaInicial),
        cargo: configuracao.eleicao.cargoPadrao,
        uf: String(configuracao.eleicao.localPadrao || 'SP').toLowerCase(),
        partido: 'todos',
        busca: '',
        candidatos: [],
        statusApi: 'consultando',
        metadados: null,
        dataPrimeiroTurno: configuracao.eleicao.dataPrimeiroTurno,
        ultimaConsulta: 0,
        pausado: false,
        inicioAutoScroll: Date.now() + 1800
    };

    ajustarUfAoCargo();
    montarEstrutura();
    renderizarPagina();

    atualizarDadosApi();
    window.setInterval(atualizarDadosApi, configuracao.fonteDados.intervaloAtualizacaoMs || 120000);

    function aplicarParametrosDaUrl() {
        const marca = configuracao.marca;
        const cores = configuracao.cores;
        const substituicoes = [
            ['nome', marca, 'nome'],
            ['sigla', marca, 'sigla'],
            ['regiao', marca, 'regiao'],
            ['logo', marca, 'logoUrl'],
            ['cor1', cores, 'primaria'],
            ['cor2', cores, 'secundaria'],
            ['cor3', cores, 'destaque']
        ];

        substituicoes.forEach(([parametro, objeto, propriedade]) => {
            const valor = parametros.get(parametro);
            if (valor) objeto[propriedade] = valor.trim();
        });
    }

    function aplicarTema() {
        const cores = configuracao.cores;
        const primaria = corHexValida(cores.primaria) ? cores.primaria : '#07182d';
        const secundaria = corHexValida(cores.secundaria) ? cores.secundaria : '#9cf2cf';
        const destaque = corHexValida(cores.destaque) ? cores.destaque : '#9cf2cf';
        const estilos = document.documentElement.style;

        estilos.setProperty('--pe-primaria', primaria);
        estilos.setProperty('--pe-secundaria', secundaria);
        estilos.setProperty('--pe-destaque', destaque);
        estilos.setProperty('--pe-sobre-primaria', corDeContraste(primaria));
        estilos.setProperty('--pe-sobre-secundaria', corDeContraste(secundaria));
        estilos.setProperty('--pe-sobre-destaque', corDeContraste(destaque));
        estilos.setProperty('--pe-primaria-suave', misturarComBranco(primaria, 0.9));
        estilos.setProperty('--pe-secundaria-suave', misturarComBranco(secundaria, 0.88));
        estilos.setProperty('--pe-destaque-suave', misturarComBranco(destaque, 0.86));
        estilos.setProperty('--pe-primaria-escura', misturarComPreto(primaria, 0.18));
    }

    function corHexValida(cor) {
        return /^#[0-9a-f]{6}$/i.test(String(cor || ''));
    }

    function canaisHex(cor) {
        return [1, 3, 5].map((inicio) => Number.parseInt(cor.slice(inicio, inicio + 2), 16));
    }

    function paraHex(valor) {
        return Math.round(Math.max(0, Math.min(255, valor))).toString(16).padStart(2, '0');
    }

    function misturar(cor, destino, proporcao) {
        const origem = canaisHex(cor);
        return `#${origem.map((canal, indice) => paraHex(canal + (destino[indice] - canal) * proporcao)).join('')}`;
    }

    function misturarComBranco(cor, proporcao) {
        return misturar(cor, [255, 255, 255], proporcao);
    }

    function misturarComPreto(cor, proporcao) {
        return misturar(cor, [0, 0, 0], proporcao);
    }

    function corDeContraste(cor) {
        const [r, g, b] = canaisHex(cor).map((canal) => {
            const valor = canal / 255;
            return valor <= 0.03928 ? valor / 12.92 : ((valor + 0.055) / 1.055) ** 2.4;
        });
        return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 0.46 ? '#102033' : '#ffffff';
    }

    function escaparHtml(valor) {
        return String(valor ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function normalizarPagina(valor) {
        return valor === 'candidatos' ? 'candidatos' : 'inicio';
    }

    function obterSigla() {
        if (configuracao.marca.sigla) return configuracao.marca.sigla;
        const palavras = configuracao.marca.nome.trim().split(/\s+/).filter(Boolean);
        if (palavras.length === 1) return palavras[0].slice(0, 3).toUpperCase();
        return palavras.slice(0, 3).map((palavra) => palavra[0]).join('').toUpperCase();
    }

    function obterIniciais(nome) {
        const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
        if (!partes.length) return 'C';
        if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
        return `${partes[0][0]}${partes.at(-1)[0]}`.toUpperCase();
    }

    function icone(nome) {
        const icones = {
            inicio: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1Z"/></svg>',
            pessoas: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0Z"/></svg>',
            busca: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>',
            predio: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h18L12 3Z"/><path d="M5 10v9M9 10v9M15 10v9M19 10v9M3 21h18"/></svg>',
            pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s7-6.2 7-13a7 7 0 1 0-14 0c0 6.8 7 13 7 13Z"/><circle cx="12" cy="9" r="2.5"/></svg>',
            painel: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 21h8M12 18v3M14 8h4v4M18 8l-6 6"/></svg>'
        };
        return icones[nome] || '';
    }

    function marcaHtml(classeExtra = '') {
        const marca = configuracao.marca;
        const logo = marca.logoUrl
            ? `<span class="pe-logo"><img src="${escaparHtml(marca.logoUrl)}" alt="${escaparHtml(marca.logoAlt)}"></span>`
            : '<span class="pe-logo brand-mark" aria-hidden="true"></span>';

        return `
            <div class="pe-marca ${classeExtra}">
                ${logo}
                <span class="pe-nome-completo">${escaparHtml(marca.nome)}</span>
                <span class="pe-sigla">${escaparHtml(obterSigla())}</span>
                ${marca.edicao ? `<strong class="pe-edicao">${escaparHtml(marca.edicao)}</strong>` : ''}
            </div>
        `;
    }

    function montarEstrutura() {
        const classesComBase = {
            '970x90': 'pe-widget--horizontal pe-widget--970x90',
            '970x250x100': 'pe-widget--970x250 pe-widget--970x250x100'
        };
        const classesFormato = classesComBase[formato] || `pe-widget--${escaparHtml(formato)}`;

        document.title = `${configuracao.marca.nome} ${configuracao.marca.edicao || ''} — Eleições ${configuracao.eleicao.ano}`.trim();
        raiz.innerHTML = `
            <article class="pe-widget ${classesFormato}">
                <aside class="pe-lateral">
                    ${marcaHtml()}
                    <span class="pe-turno">${configuracao.eleicao.turno}º turno</span>
                    ${navegacaoHtml('pe-nav-lateral')}
                </aside>
                <section class="pe-conteudo">
                    <header class="pe-cabecalho-mobile">
                        ${marcaHtml('pe-marca-horizontal')}
                        <span class="pe-turno">${configuracao.eleicao.turno}º turno</span>
                    </header>
                    <div id="pe-painel" class="pe-painel"></div>
                    ${navegacaoHtml('pe-nav-mobile')}
                </section>
            </article>
        `;

        raiz.querySelectorAll('[data-pagina]').forEach((botao) => {
            botao.addEventListener('click', () => {
                estado.pagina = normalizarPagina(botao.dataset.pagina);
                renderizarPagina();
            });
        });
    }

    function navegacaoHtml(classe) {
        return `
            <nav class="pe-nav ${classe}" aria-label="Seções do widget">
                <button type="button" data-pagina="inicio">
                    ${icone('inicio')}<span>${escaparHtml(configuracao.interface.rotuloInicio)}</span>
                </button>
                <button type="button" data-pagina="candidatos">
                    ${icone('pessoas')}<span>${escaparHtml(configuracao.interface.rotuloCandidatos)}</span>
                </button>
            </nav>
        `;
    }

    function atualizarNavegacao() {
        raiz.querySelectorAll('[data-pagina]').forEach((botao) => {
            const ativo = botao.dataset.pagina === estado.pagina;
            botao.classList.toggle('is-ativo', ativo);
            botao.setAttribute('aria-current', ativo ? 'page' : 'false');
        });
    }

    function renderizarPagina() {
        atualizarNavegacao();
        const painel = document.getElementById('pe-painel');
        painel.className = `pe-painel pe-painel--${estado.pagina}`;

        if (estado.pagina === 'candidatos') renderizarAreaCandidatos(painel);
        else renderizarAreaInicial(painel);
    }

    function renderizarAreaInicial(painel) {
        const data = new Date(estado.dataPrimeiroTurno);
        const dias = calcularDiasRestantes(estado.dataPrimeiroTurno);
        const dataFormatada = new Intl.DateTimeFormat('pt-BR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        }).format(data);
        painel.innerHTML = `
            <div class="pe-inicio">
                <div class="pe-contagem" aria-label="Faltam ${dias} dias para o primeiro turno">
                    <strong>${dias}</strong><span>dias</span>
                </div>
                <div class="pe-chamada">
                    <span class="pe-sobrelinha">Eleições ${configuracao.eleicao.ano}</span>
                    <h1>para o ${configuracao.eleicao.turno}º turno</h1>
                    <p>${capitalizar(dataFormatada)}</p>
                </div>
                <div class="pe-acoes">
                    <a href="${escaparHtml(configuracao.eleicao.urlTse)}" target="_blank" rel="noopener noreferrer" aria-label="Acompanhe no TSE">
                        ${icone('predio')}<span>Acompanhe no TSE</span>
                    </a>
                    <a href="${escaparHtml(configuracao.eleicao.urlLocalVotacao)}" target="_blank" rel="noopener noreferrer" aria-label="Consulte seu local de votação">
                        ${icone('pin')}<span>Consulte seu local</span>
                    </a>
                    <a class="pe-cta" href="${escaparHtml(configuracao.eleicao.urlAdquirir)}" target="_blank" rel="noopener noreferrer" aria-label="Adquira o Painel Eleitoral 2026">
                        ${icone('painel')}<span class="pe-cta-amplo">Adquira este painel</span><span class="pe-cta-curto">Adquira</span>
                    </a>
                </div>
                <div class="pe-resumo-eleicao">
                    <div><strong>${configuracao.cargos.length}</strong><span>cargos</span></div>
                    <div><strong>${configuracao.eleicao.turno}º</strong><span>turno</span></div>
                    <div><strong>${escaparHtml(estado.uf === 'br' ? 'Brasil' : estado.uf.toUpperCase())}</strong><span>abrangência</span></div>
                </div>
            </div>
        `;
    }

    function capitalizar(texto) {
        return texto ? texto[0].toUpperCase() + texto.slice(1) : '';
    }

    function calcularDiasRestantes(dataEleicao) {
        const [anoEleicao, mesEleicao, diaEleicao] = String(dataEleicao)
            .slice(0, 10)
            .split('-')
            .map(Number);
        const partesHoje = new Intl.DateTimeFormat('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: 'numeric',
            day: 'numeric'
        }).formatToParts(new Date());
        const hoje = Object.fromEntries(partesHoje.map((parte) => [parte.type, Number(parte.value)]));
        const inicioHoje = Date.UTC(hoje.year, hoje.month - 1, hoje.day);
        const inicioEleicao = Date.UTC(anoEleicao, mesEleicao - 1, diaEleicao);

        return Math.max(0, Math.round((inicioEleicao - inicioHoje) / 86400000));
    }

    function renderizarAreaCandidatos(painel) {
        const formatoCompacto = formato === '300x250' || formato === 'horizontal' || formato === '970x90';
        const opcoesCargo = configuracao.cargos.map((cargo) => `
            <option value="${escaparHtml(cargo.codigo)}" ${cargo.codigo === estado.cargo ? 'selected' : ''}>
                ${escaparHtml(formatoCompacto ? cargo.nomeCompacto : cargo.nome)}
            </option>
        `).join('');

        painel.innerHTML = `
            <div class="pe-candidatos">
                <div class="pe-filtros">
                    <label class="pe-campo pe-campo-cargo">
                        <span>Cargo</span>
                        <select id="pe-filtro-cargo">${opcoesCargo}</select>
                    </label>
                    <label class="pe-campo pe-campo-uf">
                        <span>Estado</span>
                        <select id="pe-filtro-uf" aria-label="Estado"></select>
                    </label>
                    <label class="pe-campo pe-campo-partido">
                        <span>Partido</span>
                        <select id="pe-filtro-partido"></select>
                    </label>
                    <label class="pe-campo pe-campo-busca">
                        <span>Buscar candidato</span>
                        ${icone('busca')}
                        <input id="pe-filtro-busca" type="search" value="${escaparHtml(estado.busca)}" placeholder="${formatoCompacto ? 'Buscar' : 'Nome ou número'}" autocomplete="off">
                    </label>
                    <span id="pe-total-candidatos" class="pe-total"></span>
                </div>
                <div id="pe-lista-candidatos" class="pe-lista" tabindex="0" aria-label="Lista de candidatos"></div>
            </div>
        `;

        const seletorCargo = document.getElementById('pe-filtro-cargo');
        const seletorUf = document.getElementById('pe-filtro-uf');
        const seletorPartido = document.getElementById('pe-filtro-partido');
        const campoBusca = document.getElementById('pe-filtro-busca');

        preencherUfs(seletorUf);
        preencherPartidos(seletorPartido);
        renderizarCards();

        seletorCargo.addEventListener('change', async () => {
            estado.cargo = seletorCargo.value;
            estado.partido = 'todos';
            estado.busca = '';
            campoBusca.value = '';
            ajustarUfAoCargo();
            preencherUfs(seletorUf);
            prepararNovaConsulta();
            renderizarCards();
            await atualizarDadosApi();
        });
        seletorUf.addEventListener('change', async () => {
            estado.uf = seletorUf.value;
            estado.partido = 'todos';
            prepararNovaConsulta();
            renderizarCards();
            await atualizarDadosApi();
        });
        seletorPartido.addEventListener('change', () => {
            estado.partido = seletorPartido.value;
            renderizarCards();
        });
        campoBusca.addEventListener('input', () => {
            estado.busca = campoBusca.value;
            renderizarCards();
        });
    }

    function cargoSelecionado() {
        return configuracao.cargos.find((cargo) => cargo.codigo === estado.cargo) || configuracao.cargos[0];
    }

    function ajustarUfAoCargo() {
        const cargo = cargoSelecionado();
        const ufsValidas = configuracao.unidadesFederativas.map((uf) => uf.sigla);
        if (cargo.abrangencia === 'nacional') {
            estado.uf = 'br';
        } else if (cargo.abrangencia === 'distrital') {
            estado.uf = 'df';
        } else if (estado.uf === 'br' || !ufsValidas.includes(estado.uf) || (cargo.codigo === '7' && estado.uf === 'df')) {
            estado.uf = String(configuracao.eleicao.localPadrao || 'SP').toLowerCase();
        }
    }

    function preencherUfs(seletor) {
        const cargo = cargoSelecionado();
        const nacional = cargo.abrangencia === 'nacional';
        const distrital = cargo.abrangencia === 'distrital';
        const ufs = configuracao.unidadesFederativas.filter((uf) => {
            if (nacional) return uf.sigla === 'br';
            if (distrital) return uf.sigla === 'df';
            if (cargo.codigo === '7' && uf.sigla === 'df') return false;
            return uf.sigla !== 'br';
        });
        seletor.innerHTML = ufs.map((uf) => `
            <option value="${escaparHtml(uf.sigla)}">${escaparHtml((formato === '300x250' || formato === 'horizontal' || formato === '970x90') && uf.sigla === 'br' ? 'Brasil' : uf.nome)}</option>
        `).join('');
        seletor.value = estado.uf;
        seletor.disabled = nacional || distrital;
        seletor.title = nacional
            ? 'A eleição presidencial tem abrangência nacional'
            : distrital
                ? 'Deputado Distrital é um cargo exclusivo do Distrito Federal'
                : 'Escolha o estado';
    }

    function prepararNovaConsulta() {
        estado.candidatos = [];
        estado.statusApi = 'consultando';
        estado.metadados = null;
    }

    function candidatosDoCargo() {
        return estado.candidatos.filter((candidato) => String(candidato.cargo) === estado.cargo);
    }

    function preencherPartidos(seletor) {
        const partidos = [...new Set(candidatosDoCargo().map((candidato) => candidato.partido).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, 'pt-BR'));
        const rotuloTodos = formato === '300x250' || formato === 'horizontal' || formato === '970x90' ? 'Partidos' : 'Todos os partidos';
        seletor.innerHTML = [
            `<option value="todos">${rotuloTodos}</option>`,
            ...partidos.map((partido) => `<option value="${escaparHtml(partido)}">${escaparHtml(partido)}</option>`)
        ].join('');
        seletor.value = partidos.includes(estado.partido) ? estado.partido : 'todos';
        estado.partido = seletor.value;
    }

    function normalizarBusca(valor) {
        return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    }

    function renderizarCards() {
        const lista = document.getElementById('pe-lista-candidatos');
        const total = document.getElementById('pe-total-candidatos');
        if (!lista || !total) return;

        if (estado.statusApi === 'consultando') {
            lista.innerHTML = '<div class="pe-estado"><span class="pe-spinner"></span>Consultando dados de 2026...</div>';
            total.textContent = '';
            return;
        }

        if (estado.statusApi === 'aguardando' || estado.statusApi === 'indisponivel') {
            const mensagem = estado.statusApi === 'aguardando'
                ? 'A base oficial de candidaturas das Eleições 2026 ainda não está disponível.'
                : 'Os dados oficiais de candidaturas estão temporariamente indisponíveis.';
            lista.innerHTML = `<div class="pe-estado">${escaparHtml(mensagem)}</div>`;
            total.textContent = '';
            return;
        }

        const termo = normalizarBusca(estado.busca);
        const candidatos = ordenarCandidatos(candidatosDoCargo().filter((candidato) => {
            const correspondePartido = estado.partido === 'todos' || candidato.partido === estado.partido;
            const alvo = normalizarBusca(`${candidato.nome} ${candidato.numero} ${candidato.partido}`);
            return correspondePartido && (!termo || alvo.includes(termo));
        }));

        const rotuloTotal = `${candidatos.length} candidato${candidatos.length === 1 ? '' : 's'}`;
        total.textContent = rotuloTotal;
        if (!candidatos.length) {
            lista.innerHTML = '<div class="pe-estado">Nenhum candidato encontrado com esses filtros.</div>';
            return;
        }

        lista.innerHTML = candidatos.map((candidato, indice) => cardCandidatoHtml(candidato, indice)).join('');
        estado.inicioAutoScroll = Date.now() + 1800;
        prepararRolagem(lista);
    }

    function ordenarCandidatos(candidatos) {
        if (estado.cargo !== '1') return candidatos;

        const nomesPrioritarios = configuracao.interface.ordemDestaquePresidente || [];
        const prioridades = new Map(
            nomesPrioritarios.map((nome, indice) => [normalizarBusca(nome), indice])
        );

        return candidatos
            .map((candidato, indiceOriginal) => ({ candidato, indiceOriginal }))
            .sort((itemA, itemB) => {
                const prioridadeA = prioridades.get(normalizarBusca(itemA.candidato.nome)) ?? Number.MAX_SAFE_INTEGER;
                const prioridadeB = prioridades.get(normalizarBusca(itemB.candidato.nome)) ?? Number.MAX_SAFE_INTEGER;
                return prioridadeA - prioridadeB || itemA.indiceOriginal - itemB.indiceOriginal;
            })
            .map(({ candidato }) => candidato);
    }

    function cardCandidatoHtml(candidato, indice) {
        const iniciais = escaparHtml(obterIniciais(candidato.nome));
        const foto = candidato.foto
            ? `<span>${iniciais}</span><img src="${escaparHtml(candidato.foto)}" alt="Foto de ${escaparHtml(candidato.nome)}" loading="lazy" onerror="this.remove()">`
            : `<span>${iniciais}</span>`;
        const cargo = configuracao.cargos.find((item) => item.codigo === String(candidato.cargo));
        const rotuloCargo = cargo ? cargo.nomeCompacto : 'Candidato';

        return `
            <article class="pe-card" style="--pe-indice:${indice}">
                <div class="pe-avatar">${foto}</div>
                <span class="pe-cargo-card">${escaparHtml(rotuloCargo)}</span>
                <h2>${escaparHtml(candidato.nome)}</h2>
                <span class="pe-partido">${escaparHtml(candidato.partido || 'Sem partido')}</span>
                <strong class="pe-numero">${escaparHtml(candidato.numero || '—')}</strong>
            </article>
        `;
    }

    function prepararRolagem(lista) {
        if (lista.dataset.rolagemPreparada) return;
        lista.dataset.rolagemPreparada = 'true';
        let arrastando = false;
        let inicioX = 0;
        let inicioScroll = 0;

        lista.addEventListener('pointerdown', (evento) => {
            if (evento.pointerType === 'mouse' && evento.button !== 0) return;
            arrastando = true;
            estado.pausado = true;
            inicioX = evento.clientX;
            inicioScroll = lista.scrollLeft;
            lista.setPointerCapture?.(evento.pointerId);
        });
        lista.addEventListener('pointermove', (evento) => {
            if (!arrastando) return;
            lista.scrollLeft = inicioScroll - (evento.clientX - inicioX);
        });
        const finalizar = () => {
            arrastando = false;
            estado.pausado = false;
            estado.inicioAutoScroll = Date.now() + 1200;
        };
        lista.addEventListener('pointerup', finalizar);
        lista.addEventListener('pointercancel', finalizar);
        lista.addEventListener('lostpointercapture', finalizar);

        if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
            lista.addEventListener('mouseenter', () => { estado.pausado = true; });
            lista.addEventListener('mouseleave', () => {
                estado.pausado = false;
                estado.inicioAutoScroll = Date.now() + 800;
            });
        }
    }

    let ultimoFrame = performance.now();
    let listaAutoScroll = null;
    let posicaoAutoScroll = 0;
    let autoScrollAtivo = false;

    function reiniciarAutoScroll() {
        autoScrollAtivo = false;
        listaAutoScroll = null;
        estado.inicioAutoScroll = Date.now() + 500;
    }

    window.addEventListener('resize', reiniciarAutoScroll, { passive: true });
    window.visualViewport?.addEventListener('resize', reiniciarAutoScroll, { passive: true });

    function animarRolagem(tempo) {
        const lista = document.getElementById('pe-lista-candidatos');
        const formatoComRolagem = formato === 'horizontal' || formato === '970x90' || formato === '970x250' || formato === '970x250x100';
        const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const deveAnimar = formatoComRolagem && (formato === '970x250x100' || !reduzirMovimento);
        const delta = Math.min(tempo - ultimoFrame, 50);
        ultimoFrame = tempo;
        const podeRolar = deveAnimar
            && lista
            && !estado.pausado
            && Date.now() >= estado.inicioAutoScroll
            && lista.scrollWidth > lista.clientWidth;

        if (podeRolar) {
            if (!autoScrollAtivo || listaAutoScroll !== lista) {
                listaAutoScroll = lista;
                posicaoAutoScroll = lista.scrollLeft;
            }

            posicaoAutoScroll += delta * 0.035;
            const limite = Math.max(0, lista.scrollWidth - lista.clientWidth);

            if (posicaoAutoScroll >= limite - 1) {
                lista.scrollLeft = 0;
                posicaoAutoScroll = 0;
                estado.inicioAutoScroll = Date.now() + 1000;
                autoScrollAtivo = false;
            } else {
                lista.scrollLeft = posicaoAutoScroll;
                autoScrollAtivo = true;
            }
        } else {
            autoScrollAtivo = false;
            if (lista) posicaoAutoScroll = lista.scrollLeft;
        }
        window.requestAnimationFrame(animarRolagem);
    }
    window.requestAnimationFrame(animarRolagem);

    function obterBaseCandidatos() {
        return String(configuracao.fonteDados.candidatosBaseUrl || './data/2026').replace(/\/+$/, '');
    }

    async function requisitarJson(caminho) {
        const resposta = await fetch(`${obterBaseCandidatos()}${caminho}`, {
            cache: 'no-cache',
            headers: { Accept: 'application/json' }
        });
        let dados = {};
        try {
            dados = await resposta.json();
        } catch (erro) {
            dados = {};
        }
        return { resposta, dados };
    }

    async function atualizarDadosApi() {
        const numeroConsulta = ++estado.ultimaConsulta;
        const cargo = cargoSelecionado();
        const cargoConsulta = cargo.codigo;
        const ufConsulta = cargo.abrangencia === 'nacional' ? 'br' : estado.uf;
        estado.statusApi = estado.candidatos.length ? estado.statusApi : 'consultando';
        if (estado.pagina === 'candidatos') renderizarCards();

        try {
            const candidatos = await requisitarJson(`/${encodeURIComponent(ufConsulta)}/${encodeURIComponent(cargoConsulta)}.json`);
            if (numeroConsulta !== estado.ultimaConsulta) return;
            if (candidatos.resposta.status === 404) {
                estado.candidatos = [];
                estado.metadados = null;
                estado.statusApi = 'aguardando';
            } else if (!candidatos.resposta.ok || !Array.isArray(candidatos.dados.candidatos)) {
                throw new Error('Base de candidaturas indisponível');
            } else {
                estado.candidatos = candidatos.dados.candidatos.map((candidato) => ({ ...candidato, cargo: cargoConsulta }));
                estado.metadados = candidatos.dados.meta || null;
                estado.statusApi = 'disponivel';
            }
        } catch (erro) {
            if (numeroConsulta !== estado.ultimaConsulta) return;
            estado.statusApi = estado.candidatos.length ? 'disponivel' : 'indisponivel';
        }

        if (estado.pagina === 'candidatos') {
            const seletorPartido = document.getElementById('pe-filtro-partido');
            if (seletorPartido) preencherPartidos(seletorPartido);
            renderizarCards();
        } else {
            renderizarPagina();
        }
    }
})();
