import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { podeAcessar } from '../../domain/cargos.js';
import {
  VIAS,
  diaNoAbrigo,
  dosesPrevistas,
  intervaloDoDiaNoAbrigo,
} from '../../domain/medicacao.js';
import { DataISO } from '../../lib/datas.js';
import {
  HttpError,
  conflito,
  naoEncontrado,
  semPermissao,
} from '../../lib/errors.js';
import { exigirCargo } from '../../plugins/auth.js';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import type { Via } from '../../domain/medicacao.js';

const Aplicacao = z.object({
  id: z.string(),
  pulada: z.boolean(),
  observacao: z.string(),
  aplicadaEm: z.string(),
  aplicadaPor: z.object({ id: z.string(), nome: z.string() }).nullable(),
});

const DosePrevista = z.object({
  prescricaoId: z.string(),
  horarioPrevisto: z.string(),
  medicamento: z.string(),
  dose: z.string(),
  via: z.enum(VIAS),
  observacao: z.string(),
  gato: z.object({
    id: z.string(),
    nome: z.string(),
    fotoUrl: z.string().nullable(),
  }),
  aplicacao: Aplicacao.nullable(),
});

const includeAplicacao = {
  aplicadaPor: { select: { id: true, nome: true } },
} satisfies Prisma.AplicacaoInclude;

function toAplicacao(
  a: Prisma.AplicacaoGetPayload<{ include: typeof includeAplicacao }>,
) {
  return {
    id: a.id,
    pulada: a.pulada,
    observacao: a.observacao,
    aplicadaEm: a.aplicadaEm.toISOString(),
    aplicadaPor: a.aplicadaPor,
  };
}

const RegistrarAplicacao = z
  .object({
    prescricaoId: z.uuid(),
    horarioPrevisto: z.iso.datetime({ offset: true }),
    pulada: z.boolean().default(false),
    observacao: z.string().trim().max(500).default(''),
  })
  .refine((a) => !a.pulada || a.observacao.length > 0, {
    message: 'Conte por que a dose foi pulada.',
    path: ['observacao'],
  });

export const agendaRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma } = app.deps;
  app.addHook('onRequest', exigirCargo('voluntario'));

  app.get(
    '/agenda',
    {
      schema: {
        tags: ['medicação'],
        summary:
          'Remédios do dia: doses previstas de todos os gatos (horário do abrigo)',
        security: [{ sessao: [] }],
        querystring: z.object({ dia: DataISO.optional() }),
        response: { 200: z.array(DosePrevista) },
      },
    },
    async (request) => {
      const dia = request.query.dia ?? diaNoAbrigo(new Date());
      const { inicio, fimExclusivo } = intervaloDoDiaNoAbrigo(dia);

      const prescricoes = await prisma.prescricao.findMany({
        where: {
          inicio: { lt: fimExclusivo },
          AND: [
            { OR: [{ fim: null }, { fim: { gte: inicio } }] },
            { OR: [{ encerradaEm: null }, { encerradaEm: { gt: inicio } }] },
          ],
        },
        include: {
          gato: {
            select: {
              id: true,
              nome: true,
              fotos: { orderBy: [{ capa: 'desc' }, { ordem: 'asc' }], take: 1 },
            },
          },
          aplicacoes: {
            where: { horarioPrevisto: { gte: inicio, lt: fimExclusivo } },
            include: includeAplicacao,
          },
        },
      });

      return prescricoes
        .flatMap((p) =>
          dosesPrevistas(p, inicio, fimExclusivo).map((horario) => {
            const aplicacao = p.aplicacoes.find(
              (a) => a.horarioPrevisto.getTime() === horario.getTime(),
            );
            return {
              prescricaoId: p.id,
              horarioPrevisto: horario.toISOString(),
              medicamento: p.medicamento,
              dose: p.dose,
              via: p.via as Via,
              observacao: p.observacao,
              gato: {
                id: p.gato.id,
                nome: p.gato.nome,
                fotoUrl: p.gato.fotos[0]?.url ?? null,
              },
              aplicacao: aplicacao ? toAplicacao(aplicacao) : null,
            };
          }),
        )
        .sort(
          (a, b) =>
            a.horarioPrevisto.localeCompare(b.horarioPrevisto) ||
            a.gato.nome.localeCompare(b.gato.nome),
        );
    },
  );

  app.post(
    '/aplicacoes',
    {
      schema: {
        tags: ['medicação'],
        summary: 'Registra que uma dose prevista foi dada (ou pulada)',
        security: [{ sessao: [] }],
        body: RegistrarAplicacao,
        response: { 201: Aplicacao },
      },
    },
    async (request, reply) => {
      const { prescricaoId, horarioPrevisto, pulada, observacao } =
        request.body;
      const p = await prisma.prescricao.findUnique({
        where: { id: prescricaoId },
      });
      if (!p) throw naoEncontrado('Prescrição');

      const horario = new Date(horarioPrevisto);
      const ehDosePrevista =
        dosesPrevistas(p, horario, new Date(horario.getTime() + 1)).length ===
        1;
      if (!ehDosePrevista)
        throw new HttpError(400, 'Este horário não é uma dose prevista.');

      try {
        const a = await prisma.aplicacao.create({
          data: {
            prescricaoId,
            horarioPrevisto: horario,
            pulada,
            observacao,
            aplicadaPorId: request.usuario?.id,
          },
          include: includeAplicacao,
        });
        return reply.status(201).send(toAplicacao(a));
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === 'P2002'
        ) {
          throw conflito('Esta dose já foi registrada.');
        }
        throw e;
      }
    },
  );

  app.delete(
    '/aplicacoes/:id',
    {
      schema: {
        tags: ['medicação'],
        summary: 'Desfaz o registro de uma dose (quem registrou ou adm)',
        security: [{ sessao: [] }],
        params: z.object({ id: z.uuid() }),
      },
    },
    async (request, reply) => {
      const a = await prisma.aplicacao.findUnique({
        where: { id: request.params.id },
      });
      if (!a) throw naoEncontrado('Registro de dose');
      const usuario = request.usuario!;
      if (
        a.aplicadaPorId !== usuario.id &&
        !podeAcessar(usuario.cargo, 'adm')
      ) {
        throw semPermissao();
      }
      await prisma.aplicacao.delete({ where: { id: a.id } });
      return reply.status(204).send();
    },
  );
};
