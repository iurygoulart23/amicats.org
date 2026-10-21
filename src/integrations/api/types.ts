// Espelho dos contratos da amicats-api (OpenAPI em <API>/docs).

export type Cargo = 'adm' | 'voluntario' | 'cliente';
export type StatusGato =
  'disponivel' | 'apadrinhado' | 'adotado' | 'em_tratamento' | 'falecido';
export type Sexo = 'macho' | 'femea' | 'desconhecido';
export type PrecisaoNascimento = 'dia' | 'mes' | 'ano';
export type TipoTag = 'doenca' | 'comportamento' | 'cuidado';

export type Paginado<T> = {
  itens: Array<T>;
  total: number;
  pagina: number;
  porPagina: number;
};

export type UsuarioLogado = {
  id: string;
  nome: string;
  email: string;
  cargo: Cargo;
  telefone: string | null;
  /** Recebe o resumo diário de notificações por e-mail */
  notificarPorEmail: boolean;
};

export type Usuario = UsuarioLogado & {
  ativo: boolean;
  senhaDefinida: boolean;
  criadoEm: string;
};

export type Foto = { id: string; url: string; ordem: number; capa: boolean };

export type Tag = {
  id: string;
  nome: string;
  tipo: TipoTag;
  cor: string | null;
};

export type TagDoGato = Tag & { ativa: boolean };

export type Gato = {
  id: string;
  slug: string;
  nome: string;
  dataNascimentoAprox: string | null;
  precisaoNascimento: PrecisaoNascimento;
  sexo: Sexo;
  status: StatusGato;
  castrado: boolean;
  descricaoPt: string;
  descricaoEn: string | null;
  observacoes: string;
  publicado: boolean;
  fotos: Array<Foto>;
  tags: Array<TagDoGato>;
  criadoEm: string;
  atualizadoEm: string;
};

export type GatoPublico = Omit<
  Gato,
  'id' | 'observacoes' | 'publicado' | 'tags' | 'criadoEm' | 'atualizadoEm'
> & {
  tags: Array<Tag>;
  /** Padrinhos ativos (selo "apadrinhado" quando > 0) */
  padrinhos: number;
  /** Média mensal dos gastos nos últimos 3 meses completos */
  custoMensalEstimadoCentavos: number | null;
};

export type GatoInput = Partial<
  Pick<
    Gato,
    | 'nome'
    | 'dataNascimentoAprox'
    | 'precisaoNascimento'
    | 'sexo'
    | 'status'
    | 'castrado'
    | 'descricaoPt'
    | 'descricaoEn'
    | 'observacoes'
    | 'publicado'
  >
>;

export type RegistroSaude = {
  id: string;
  titulo: string;
  dataInicio: string;
  dataFim: string | null;
  emCurso: boolean;
  observacao: string;
  tag: { id: string; nome: string } | null;
  registradoPor: { id: string; nome: string } | null;
  criadoEm: string;
};

export type CategoriaGasto =
  'racao' | 'medicamento' | 'veterinario' | 'exame' | 'higiene' | 'outro';

export type Gasto = {
  id: string;
  categoria: CategoriaGasto;
  descricao: string;
  valorCentavos: number;
  data: string;
  registradoPor: { id: string; nome: string } | null;
};

export type GastosDoMes = {
  mes: string;
  totalCentavos: number;
  itens: Array<Gasto>;
};

export type Apadrinhamento = {
  id: string;
  ativo: boolean;
  inicio: string;
  fim: string | null;
  gato: { id: string; slug: string; nome: string; fotoUrl: string | null };
  /** Soma do que falta pagar nos meses fechados */
  faltaPagarCentavos: number;
  /** Meses fechados com valor a pagar (AAAA-MM, do mais antigo ao mais recente) */
  mesesEmAberto: Array<string>;
};

export type StatusPagamento =
  'pendente' | 'aprovado' | 'recusado' | 'estornado';

export type PagamentoParte = {
  id: string;
  valorCentavos: number;
  status: StatusPagamento;
  /** Só enquanto pendente: para retomar o pagamento */
  checkoutUrl: string | null;
  pagoEm: string | null;
  criadoEm: string;
};

/** Situação pública de uma doação (página de obrigado) */
export type Doacao = {
  id: string;
  status: StatusPagamento;
  valorCentavos: number;
  checkoutUrl: string | null;
  pagoEm: string | null;
};

export type Extrato = GastosDoMes & {
  /** Padrinhos ativos em algum dia do mês */
  padrinhosNoMes: number;
  /** Total do mês dividido igualmente entre os padrinhos do mês */
  parteCentavos: number;
  pagoCentavos: number;
  faltaCentavos: number;
  /** Mês já encerrado: a parte pode ser paga */
  fechado: boolean;
  pagamentos: Array<PagamentoParte>;
};

export type Padrinho = {
  apadrinhamentoId: string;
  nome: string;
  email: string;
  telefone: string | null;
  inicio: string;
};

export type Via =
  'oral' | 'topica' | 'injetavel' | 'ocular' | 'otologica' | 'outra';

export type Prescricao = {
  id: string;
  medicamento: string;
  dose: string;
  via: Via;
  intervaloHoras: number;
  /** ISO (UTC) da primeira dose */
  inicio: string;
  fim: string | null;
  encerradaEm: string | null;
  prescritoPor: string | null;
  observacao: string;
  criadoPor: { id: string; nome: string } | null;
};

export type AplicacaoDose = {
  id: string;
  pulada: boolean;
  observacao: string;
  aplicadaEm: string;
  aplicadaPor: { id: string; nome: string } | null;
};

export type DosePrevista = {
  prescricaoId: string;
  horarioPrevisto: string;
  medicamento: string;
  dose: string;
  via: Via;
  observacao: string;
  gato: { id: string; nome: string; fotoUrl: string | null };
  aplicacao: AplicacaoDose | null;
};

export type TipoEventoVet =
  | 'consulta'
  | 'vacina'
  | 'vermifugo'
  | 'exame'
  | 'cirurgia'
  | 'castracao'
  | 'outro';

export type EventoVet = {
  id: string;
  tipo: TipoEventoVet;
  titulo: string;
  data: string;
  local: string | null;
  observacao: string;
  proximaData: string | null;
  registradoPor: { id: string; nome: string } | null;
};

export type Retorno = EventoVet & {
  atrasado: boolean;
  gato: { id: string; nome: string };
};

export type TipoNotificacao =
  | 'gasto_novo'
  | 'apadrinhamento_novo'
  | 'dose_atrasada'
  | 'retorno_proximo'
  | 'assinatura_nova'
  | 'parte_do_mes'
  | 'pagamento_aprovado'
  | 'doacao_recebida';

export type Notificacao = {
  id: string;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  /** Caminho na área logada sem o idioma, ex.: /app/remedios */
  link: string | null;
  lida: boolean;
  criadoEm: string;
};

export type PlanoClube = {
  id: string;
  nome: string;
  descricao: string;
  valorCentavos: number;
  ativo: boolean;
  ordem: number;
};

export type StatusAssinatura = 'pendente' | 'ativa' | 'pausada' | 'cancelada';

export type MinhaAssinatura = {
  id: string;
  status: StatusAssinatura;
  valorCentavos: number;
  plano: { id: string; nome: string };
  /** Só enquanto pendente: link para concluir o pagamento no Mercado Pago */
  checkoutUrl: string | null;
  proximaCobranca: string | null;
  ativadaEm: string | null;
  canceladaEm: string | null;
  criadoEm: string;
  cobrancas: Array<{
    id: string;
    valorCentavos: number;
    status: 'aprovada' | 'recusada' | 'pendente';
    data: string;
  }>;
};

export type AssinaturasClube = {
  ativas: number;
  receitaMensalCentavos: number;
  itens: Array<{
    id: string;
    status: StatusAssinatura;
    valorCentavos: number;
    plano: { id: string; nome: string };
    assinante: { id: string; nome: string; email: string };
    ativadaEm: string | null;
    proximaCobranca: string | null;
    criadoEm: string;
  }>;
};
