import { z } from 'zod';
import { TIPOS_EVENTO_VET, diaNoAbrigo } from '../../domain/medicacao.js';
import { DataISO, deData, paraData } from '../../lib/datas.js';
import { HttpError, naoEncontrado } from '../../lib/errors.js';
import { exigirCargo } from '../../plugins/auth.js';
import { ParamsGato } from '../gatos/routes.js';
import type { Prisma } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { TipoEventoVet } from '../../domain/medicacao.js';

/** Retornos vencidos há mais tempo que isso deixam de aparecer na lista. */
const DIAS_ATRASO_VISIVEIS = 60;

const EventoVet = z.object({
  id: z.string(),
  tipo: z.enum(TIPOS_EVENTO_VET),
  titulo: z.string(),
  data: z.string(),
  local: z.string().nullable(),
  observacao: z.string(),
  proximaData: z.string().nullable(),
  registradoPor: z.object({ id: z.string(), nome: z.string() }).nullable(),
});

const include = {
  registradoPor: { select: { id: true, nome: true } },
} satisfies Prisma.EventoVeterinarioInclude;

function toEvento(
  e: Prisma.EventoVeterinarioGetPayload<{ include: typeof include }>,
) {
  return {
    id: e.id,
    tipo: e.tipo as TipoEventoVet,
    titulo: e.titulo,
    data: deData(e.data),
    local: e.local,
    observacao: e.observacao,
    proximaData: e.proximaData ? deData(e.proximaData) : null,
    registradoPor: e.registradoPor,
  };
}

const campos = {
  tipo: z.enum(TIPOS_EVENTO_VET),
  titulo: z.string().trim().min(1).max(120),
  data: DataISO,
  local: z.string().trim().max(120).nullable(),
  observacao: z.string().max(5000),
  proximaData: DataISO.nullable(),
};

function validarRetorno(data: string, proximaData: string | null | undefined) {
  if (proximaData && proximaData < data) {
    throw new HttpError(400, 'O retorno não pode ser antes da data do evento.');
  }
}

const ParamsEvento = ParamsGato.extend({ eventoId: z.uuid() });

/** Rotas por gato: /gatos/:id/veterinario */
export const veterinarioGatoRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma } = app.deps;
  app.addHook('onRequest', exigirCargo('voluntario'));

  async function garantirGato(id: string) {
    const gato = await prisma.gato.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!gato) throw naoEncontrado('Gato');
  }

  async function buscar(gatoId: string, eventoId: string) {
    const e = await prisma.eventoVeterinario.findFirst({
      where: { id: eventoId, gatoId },
    });
    if (!e) throw naoEncontrado('Evento veterinário');
    return e;
  }

  app.get(
    '/:id/veterinario',
    {
      schema: {
        tags: ['veterinário'],
        summary: 'Histórico veterinário do gato (mais recente primeiro)',
        security: [{ sessao: [] }],
        params: ParamsGato,
        response: { 200: z.array(EventoVet) },
      },
    },
    async (request) => {
      await garantirGato(request.params.id);
      const eventos = await prisma.eventoVeterinario.findMany({
        where: { gatoId: request.params.id },
        include,
        orderBy: [{ data: 'desc' }, { criadoEm: 'desc' }],
      });
      return eventos.map(toEvento);
    },
  );

  app.post(
    '/:id/veterinario',
    {
      schema: {
        tags: ['veterinário'],
        summary:
          'Registra consulta, vacina, vermífugo, exame, cirurgia ou castração',
        security: [{ sessao: [] }],
        params: ParamsGato,
        body: z
          .object(campos)
          .partial({ local: true, observacao: true, proximaData: true }),
        response: { 201: EventoVet },
      },
    },
    async (request, reply) => {
      await garantirGato(request.params.id);
      const { data, proximaData, ...resto } = request.body;
      validarRetorno(data, proximaData);
      const e = await prisma.eventoVeterinario.create({
        data: {
          ...resto,
          gatoId: request.params.id,
          data: paraData(data),
          proximaData: proximaData ? paraData(proximaData) : null,
          registradoPorId: request.usuario?.id,
        },
        include,
      });
      return reply.status(201).send(toEvento(e));
    },
  );

  app.patch(
    '/:id/veterinario/:eventoId',
    {
      schema: {
        tags: ['veterinário'],
        security: [{ sessao: [] }],
        params: ParamsEvento,
        body: z.object(campos).partial(),
        response: { 200: EventoVet },
      },
    },
    async (request) => {
      const atual = await buscar(request.params.id, request.params.eventoId);
      const { data, proximaData, ...resto } = request.body;
      validarRetorno(
        data ?? deData(atual.data),
        proximaData === undefined
          ? atual.proximaData && deData(atual.proximaData)
          : proximaData,
      );
      const e = await prisma.eventoVeterinario.update({
        where: { id: atual.id },
        data: {
          ...resto,
          ...(data && { data: paraData(data) }),
          ...(proximaData !== undefined && {
            proximaData: proximaData ? paraData(proximaData) : null,
          }),
        },
        include,
      });
      return toEvento(e);
    },
  );

  app.delete(
    '/:id/veterinario/:eventoId',
    {
      schema: {
        tags: ['veterinário'],
        security: [{ sessao: [] }],
        params: ParamsEvento,
      },
    },
    async (request, reply) => {
      const atual = await buscar(request.params.id, request.params.eventoId);
      await prisma.eventoVeterinario.delete({ where: { id: atual.id } });
      return reply.status(204).send();
    },
  );
};

/** Rotas gerais: /veterinario/retornos */
export const veterinarioRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma } = app.deps;
  app.addHook('onRequest', exigirCargo('voluntario'));

  app.get(
    '/retornos',
    {
      schema: {
        tags: ['veterinário'],
        summary:
          'Retornos marcados (atrasados e dos próximos dias) de todos os gatos',
        security: [{ sessao: [] }],
        querystring: z.object({
          dias: z.coerce.number().int().min(1).max(365).default(30),
        }),
        response: {
          200: z.array(
            EventoVet.extend({
              atrasado: z.boolean(),
              gato: z.object({ id: z.string(), nome: z.string() }),
            }),
          ),
        },
      },
    },
    async (request) => {
      const hoje = diaNoAbrigo(new Date());
      const somarDias = (dia: string, n: number) =>
        deData(new Date(paraData(dia).getTime() + n * 24 * 60 * 60 * 1000));
      const eventos = await prisma.eventoVeterinario.findMany({
        where: {
          proximaData: {
            gte: paraData(somarDias(hoje, -DIAS_ATRASO_VISIVEIS)),
            lte: paraData(somarDias(hoje, request.query.dias)),
          },
          gato: { status: { notIn: ['adotado', 'falecido'] } },
        },
        include: { ...include, gato: { select: { id: true, nome: true } } },
        orderBy: { proximaData: 'asc' },
      });
      return eventos.map((e) => ({
        ...toEvento(e),
        atrasado: deData(e.proximaData!) < hoje,
        gato: e.gato,
      }));
    },
  );
};
