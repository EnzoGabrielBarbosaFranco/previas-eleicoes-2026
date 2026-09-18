/*
 * Personalização central da prévia.
 * Troque apenas os valores deste arquivo para criar a versão de um cliente.
 * Também é possível testar marca e cores pela URL; veja README.md.
 */
window.PREVIA_ELEITORAL_CONFIG = {
    marca: {
        nome: 'PAINEL ELEITORAL',
        sigla: 'PE',
        edicao: '26',
        regiao: '',
        logoUrl: '',
        logoAlt: 'Marca do portal'
    },

    cores: {
        primaria: '#07182d',
        secundaria: '#9cf2cf',
        destaque: '#9cf2cf'
    },

    eleicao: {
        ano: 2026,
        turno: 1,
        dataPrimeiroTurno: '2026-10-04T17:00:00-03:00',
        localPadrao: 'MS',
        cargoPadrao: '1',
        urlTse: 'https://resultados.tse.jus.br/',
        urlLocalVotacao: 'https://www.tse.jus.br/servicos-eleitorais/autoatendimento-eleitoral#/onde-votar',
        urlAdquirir: 'https://paineleleitoral2026.vercel.app/'
    },

    interface: {
        paginaInicial: 'inicio',
        rotuloInicio: 'Visão geral',
        rotuloCandidatos: 'Candidatos'
    },

    fonteDados: {
        candidatosBaseUrl: './data/2026',
        intervaloAtualizacaoMs: 21600000
    },

    cargos: [
        { codigo: '1', nome: 'Presidente', nomeCompacto: 'Presidente', abrangencia: 'nacional' },
        { codigo: '3', nome: 'Governador', nomeCompacto: 'Governador', abrangencia: 'estadual' },
        { codigo: '5', nome: 'Senador', nomeCompacto: 'Senador', abrangencia: 'estadual' },
        { codigo: '6', nome: 'Deputado Federal', nomeCompacto: 'Dep. Federal', abrangencia: 'estadual' },
        { codigo: '7', nome: 'Deputado Estadual', nomeCompacto: 'Dep. Estadual', abrangencia: 'estadual' },
        { codigo: '8', nome: 'Deputado Distrital', nomeCompacto: 'Dep. Distrital', abrangencia: 'distrital' }
    ],

    unidadesFederativas: [
        { sigla: 'br', nome: 'Brasil (Total)' },
        { sigla: 'ac', nome: 'Acre' },
        { sigla: 'al', nome: 'Alagoas' },
        { sigla: 'ap', nome: 'Amapá' },
        { sigla: 'am', nome: 'Amazonas' },
        { sigla: 'ba', nome: 'Bahia' },
        { sigla: 'ce', nome: 'Ceará' },
        { sigla: 'df', nome: 'Distrito Federal' },
        { sigla: 'es', nome: 'Espírito Santo' },
        { sigla: 'go', nome: 'Goiás' },
        { sigla: 'ma', nome: 'Maranhão' },
        { sigla: 'mt', nome: 'Mato Grosso' },
        { sigla: 'ms', nome: 'Mato Grosso do Sul' },
        { sigla: 'mg', nome: 'Minas Gerais' },
        { sigla: 'pa', nome: 'Pará' },
        { sigla: 'pb', nome: 'Paraíba' },
        { sigla: 'pr', nome: 'Paraná' },
        { sigla: 'pe', nome: 'Pernambuco' },
        { sigla: 'pi', nome: 'Piauí' },
        { sigla: 'rj', nome: 'Rio de Janeiro' },
        { sigla: 'rn', nome: 'Rio Grande do Norte' },
        { sigla: 'rs', nome: 'Rio Grande do Sul' },
        { sigla: 'ro', nome: 'Rondônia' },
        { sigla: 'rr', nome: 'Roraima' },
        { sigla: 'sc', nome: 'Santa Catarina' },
        { sigla: 'sp', nome: 'São Paulo' },
        { sigla: 'se', nome: 'Sergipe' },
        { sigla: 'to', nome: 'Tocantins' }
    ]
};
