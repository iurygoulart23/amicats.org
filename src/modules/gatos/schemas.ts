import { z } from 'zod';
import {
  PRECISOES_NASCIMENTO,
  SEXOS,
  STATUS_GATO,
  TIPOS_TAG,
} from '../../domain/gato.js';
import { DataISO } from '../../lib/datas.js';

export const Foto = z.object({
  id: z.string(),
  url: z.string(),
  ordem: z.number(),
  capa: z.boolean(),
});

export const TagDoGato = z.object({
  id: z.string(),
  nome: z.string(),
  tipo: z.enum(TIPOS_TAG),
  cor: z.string().nullable(),
  /** false = condição que o gato já teve */
  ativa: z.boolean(),
});

const camposEditaveis = {
  nome: z.string().trim().min(1).max(80),
  dataNascimentoAprox: DataISO.nullable(),
  precisaoNascimento: z.enum(PRECISOES_NASCIMENTO),
  sexo: z.enum(SEXOS),
  status: z.enum(STATUS_GATO),
  castrado: z.boolean(),
  descricaoPt: z.string().max(2000),
  descricaoEn: z.string().max(2000).nullable(),
  observacoes: z.string().max(10000),
  publicado: z.boolean(),
};

export const CriarGato = z
  .object(camposEditaveis)
  .partial()
  .required({ nome: true });
export const EditarGato = z.object(camposEditaveis).partial();

export const Gato = z.object({
  id: z.string(),
  slug: z.string(),
  ...camposEditaveis,
  fotos: z.array(Foto),
  tags: z.array(TagDoGato),
  criadoEm: z.date(),
  atualizadoEm: z.date(),
});

/** O que o público vê: sem observações internas nem dados de gestão. */
export const GatoPublico = Gato.pick({
  slug: true,
  nome: true,
  dataNascimentoAprox: true,
  precisaoNascimento: true,
  sexo: true,
  status: true,
  castrado: true,
  descricaoPt: true,
  descricaoEn: true,
  fotos: true,
}).extend({
  tags: z.array(TagDoGato.omit({ ativa: true })),
});
