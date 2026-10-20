// Espelho dos contratos da amicats-api (OpenAPI em <API>/docs).

export type Cargo = 'adm' | 'voluntario' | 'cliente';
export type StatusGato =
  | 'disponivel'
  | 'apadrinhado'
  | 'adotado'
  | 'em_tratamento'
  | 'falecido';
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
> & { tags: Array<Tag> };

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
