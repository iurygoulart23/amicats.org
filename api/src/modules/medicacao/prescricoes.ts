import { z } from 'zod';
import { VIAS } from '../../domain/medicacao.js';
import { HttpError, naoEncontrado } from '../../lib/errors.js';
import { exigirCargo } from '../../plugins/auth.js';
import { ParamsGato } from '../gatos/routes.js';
import type { Prisma } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { Via } from '../../domain/medicacao.js';

const Instante = z.iso.datetime({ offset: true });

export const Prescricao = z.object({
  id: z.string(),
  medicamento: z.string(),
  dose: z.string(),
  via: z.enum(VIAS),
  intervaloHoras: z.number(),
  inicio: z.string(),
  fim: z.string().nullable(),
  encerradaEm: z.string().nullable(),
  prescritoPor: z.string().nullable(),
  observacao: z.string(),
  criadoPor: z.object({ id: z.string(), nome: z.string() }).nullable(),
});

const include = {
  criadoPor: { select: { id: true, nome: true } },
} satisfies Prisma.PrescricaoInclude;

function toPrescricao(
  p: Prisma.PrescricaoGetPayload<{ include: typeof include }>,
) {
  return {
    id: p.id,
    medicamento: p.medicamento,
    dose: p.dose,
    via: p.via as Via,
    intervaloHoras: p.intervaloHoras,
    inicio: p.inicio.toISOString(),
    fim: p.fim?.toISOString() ?? null,
    encerradaEm: p.encerradaEm?.toISOString() ?? null,
    prescritoPor: p.prescritoPor,
    observacao: p.observacao,
    criadoPor: p.criadoPor,
  };
}

const CriarPrescricao = z
  .object({
    medicamento: z.string().trim().min(1).max(120),
    dose: z.string().trim().min(1).max(80),
    via: z.enum(VIAS),
    intervaloHoras: z
      .number()
      .int()
      .min(1, 'O intervalo mínimo é de 1 hora.')
      .max(24 * 30),
    inicio: Instante,
    fim: Instante.nullable().optional(),
    prescritoPor: z.string().trim().max(120).nullable().optional(),
    observacao: z.string().max(2000).optional(),
  })
  .refine((p) => !p.fim || new Date(p.fim) >= new Date(p.inicio), {
    message: 'O fim não pode ser antes do início.',
    path: ['fim'],
  });

const ParamsPrescricao = ParamsGato.extend({ prescricaoId: z.uuid() });

export const prescricoesRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma } = app.deps;
  app.addHook('onRequest', exigirCargo('voluntario'));

  async function garantirGato(id: string) {
    const gato = await prisma.gato.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!gato) throw naoEncontrado('Gato');
  }

  async function buscar(gatoId: string, prescricaoId: string) {
    const p = await prisma.prescricao.findFirst({
      where: { id: prescricaoId, gatoId },
    });
    if (!p) throw naoEncontrado('Prescrição');
    return p;
  }

  app.get(
    '/:id/prescricoes',
    {
      schema: {
        tags: ['medicação'],
        summary: 'Prescrições do gato (mais recentes primeiro)',
        security: [{ sessao: [] }],
        params: ParamsGato,
        response: { 200: z.array(Prescricao) },
      },
    },
    async (request) => {
      await garantirGato(request.params.id);
      const lista = await prisma.prescricao.findMany({
        where: { gatoId: request.params.id },
        include,
        orderBy: { inicio: 'desc' },
      });
      return lista.map(toPrescricao);
    },
  );

  app.post(
    '/:id/prescricoes',
    {
      schema: {
        tags: ['medicação'],
        summary: 'Prescreve um medicamento',
        security: [{ sessao: [] }],
        params: ParamsGato,
        body: CriarPrescricao,
        response: { 201: Prescricao },
      },
    },
    async (request, reply) => {
      await garantirGato(request.params.id);
      const { inicio, fim, ...resto } = request.body;
      const p = await prisma.prescricao.create({
        data: {
          ...resto,
          gatoId: request.params.id,
          inicio: new Date(inicio),
          fim: fim ? new Date(fim) : null,
          criadoPorId: request.usuario?.id,
        },
        include,
      });
      return reply.status(201).send(toPrescricao(p));
    },
  );

  app.post(
    '/:id/prescricoes/:prescricaoId/encerrar',
    {
      schema: {
        tags: ['medicação'],
        summary:
          'Interrompe a prescrição agora (doses futuras deixam de aparecer)',
        security: [{ sessao: [] }],
        params: ParamsPrescricao,
        response: { 200: Prescricao },
      },
    },
    async (request) => {
      const atual = await buscar(
        request.params.id,
        request.params.prescricaoId,
      );
      if (atual.encerradaEm)
        throw new HttpError(400, 'Esta prescrição já foi encerrada.');
      const p = await prisma.prescricao.update({
        where: { id: atual.id },
        data: { encerradaEm: new Date() },
        include,
      });
      return toPrescricao(p);
    },
  );

  app.delete(
    '/:id/prescricoes/:prescricaoId',
    {
      onRequest: exigirCargo('adm'),
      schema: {
        tags: ['medicação'],
        summary: 'Exclui uma prescrição lançada por engano (só adm)',
        security: [{ sessao: [] }],
        params: ParamsPrescricao,
      },
    },
    async (request, reply) => {
      const atual = await buscar(
        request.params.id,
        request.params.prescricaoId,
      );
      await prisma.prescricao.delete({ where: { id: atual.id } });
      return reply.status(204).send();
    },
  );
};
