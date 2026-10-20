import { z } from 'zod';
import { DataISO, deData, paraData } from '../../lib/datas.js';
import { HttpError, naoEncontrado } from '../../lib/errors.js';
import { exigirCargo } from '../../plugins/auth.js';
import { ParamsGato } from '../gatos/routes.js';
import type { Prisma } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

const Registro = z.object({
  id: z.string(),
  titulo: z.string(),
  dataInicio: z.string(),
  dataFim: z.string().nullable(),
  emCurso: z.boolean(),
  observacao: z.string(),
  tag: z.object({ id: z.string(), nome: z.string() }).nullable(),
  registradoPor: z.object({ id: z.string(), nome: z.string() }).nullable(),
  criadoEm: z.date(),
});

const campos = {
  titulo: z.string().trim().min(1).max(120),
  tagId: z.uuid().nullable(),
  dataInicio: DataISO,
  dataFim: DataISO.nullable(),
  observacao: z.string().max(5000),
};

const include = {
  tag: { select: { id: true, nome: true } },
  registradoPor: { select: { id: true, nome: true } },
} satisfies Prisma.RegistroSaudeInclude;

function toRegistro(
  r: Prisma.RegistroSaudeGetPayload<{ include: typeof include }>,
) {
  return {
    id: r.id,
    titulo: r.titulo,
    dataInicio: deData(r.dataInicio),
    dataFim: r.dataFim ? deData(r.dataFim) : null,
    emCurso: !r.dataFim,
    observacao: r.observacao,
    tag: r.tag,
    registradoPor: r.registradoPor,
    criadoEm: r.criadoEm,
  };
}

function validarPeriodo(inicio: string, fim: string | null | undefined) {
  // Datas ISO AAAA-MM-DD comparam corretamente como texto.
  if (fim && fim < inicio)
    throw new HttpError(400, 'A data de fim não pode ser antes do início.');
}

const ParamsRegistro = ParamsGato.extend({ registroId: z.uuid() });

export const saudeRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma } = app.deps;
  app.addHook('onRequest', exigirCargo('voluntario'));

  async function garantirGato(id: string) {
    const gato = await prisma.gato.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!gato) throw naoEncontrado('Gato');
  }

  async function buscarRegistro(gatoId: string, registroId: string) {
    const registro = await prisma.registroSaude.findFirst({
      where: { id: registroId, gatoId },
    });
    if (!registro) throw naoEncontrado('Registro de saúde');
    return registro;
  }

  app.get(
    '/:id/saude',
    {
      schema: {
        tags: ['saude'],
        summary: 'Histórico de saúde do gato (mais recente primeiro)',
        security: [{ sessao: [] }],
        params: ParamsGato,
        response: { 200: z.array(Registro) },
      },
    },
    async (request) => {
      await garantirGato(request.params.id);
      const registros = await prisma.registroSaude.findMany({
        where: { gatoId: request.params.id },
        include,
        orderBy: [{ dataInicio: 'desc' }, { criadoEm: 'desc' }],
      });
      return registros.map(toRegistro);
    },
  );

  app.post(
    '/:id/saude',
    {
      schema: {
        tags: ['saude'],
        summary: 'Registra uma doença ou condição que o gato tem ou já teve',
        security: [{ sessao: [] }],
        params: ParamsGato,
        body: z
          .object(campos)
          .partial({ tagId: true, dataFim: true, observacao: true }),
        response: { 201: Registro },
      },
    },
    async (request, reply) => {
      await garantirGato(request.params.id);
      const { dataInicio, dataFim, ...resto } = request.body;
      validarPeriodo(dataInicio, dataFim);
      const registro = await prisma.registroSaude.create({
        data: {
          ...resto,
          gatoId: request.params.id,
          dataInicio: paraData(dataInicio),
          dataFim: dataFim ? paraData(dataFim) : null,
          registradoPorId: request.usuario?.id,
        },
        include,
      });
      return reply.status(201).send(toRegistro(registro));
    },
  );

  app.patch(
    '/:id/saude/:registroId',
    {
      schema: {
        tags: ['saude'],
        security: [{ sessao: [] }],
        params: ParamsRegistro,
        body: z.object(campos).partial(),
        response: { 200: Registro },
      },
    },
    async (request) => {
      const atual = await buscarRegistro(
        request.params.id,
        request.params.registroId,
      );
      const { dataInicio, dataFim, ...resto } = request.body;
      validarPeriodo(
        dataInicio ?? deData(atual.dataInicio),
        dataFim === undefined
          ? atual.dataFim && deData(atual.dataFim)
          : dataFim,
      );
      const registro = await prisma.registroSaude.update({
        where: { id: atual.id },
        data: {
          ...resto,
          ...(dataInicio && { dataInicio: paraData(dataInicio) }),
          ...(dataFim !== undefined && {
            dataFim: dataFim ? paraData(dataFim) : null,
          }),
        },
        include,
      });
      return toRegistro(registro);
    },
  );

  app.delete(
    '/:id/saude/:registroId',
    {
      schema: {
        tags: ['saude'],
        security: [{ sessao: [] }],
        params: ParamsRegistro,
      },
    },
    async (request, reply) => {
      const atual = await buscarRegistro(
        request.params.id,
        request.params.registroId,
      );
      await prisma.registroSaude.delete({ where: { id: atual.id } });
      return reply.status(204).send();
    },
  );
};
