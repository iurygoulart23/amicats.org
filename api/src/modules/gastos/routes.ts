import { z } from 'zod';
import { CATEGORIAS_GASTO } from '../../domain/gasto.js';
import {
  DataISO,
  MesISO,
  intervaloDoMes,
  mesDe,
  paraData,
} from '../../lib/datas.js';
import { naoEncontrado } from '../../lib/errors.js';
import { exigirCargo } from '../../plugins/auth.js';
import { ParamsGato } from '../gatos/routes.js';
import {
  notificarGastoNovo,
  notificarSemFalhar,
} from '../notificacoes/notificar.js';
import { Gasto, includeGasto, toGasto } from './mapper.js';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

const campos = {
  categoria: z.enum(CATEGORIAS_GASTO),
  descricao: z.string().trim().min(1).max(200),
  valorCentavos: z
    .number()
    .int()
    .positive('O valor precisa ser maior que zero.')
    .max(100_000_000),
  data: DataISO,
};

const ParamsGasto = ParamsGato.extend({ gastoId: z.uuid() });

export const GastosDoMes = z.object({
  mes: z.string(),
  totalCentavos: z.number(),
  itens: z.array(Gasto),
});

export const gastosRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma } = app.deps;
  app.addHook('onRequest', exigirCargo('voluntario'));

  async function garantirGato(id: string) {
    const gato = await prisma.gato.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!gato) throw naoEncontrado('Gato');
  }

  async function buscarGasto(gatoId: string, gastoId: string) {
    const gasto = await prisma.gasto.findFirst({
      where: { id: gastoId, gatoId },
    });
    if (!gasto) throw naoEncontrado('Gasto');
    return gasto;
  }

  app.get(
    '/:id/gastos',
    {
      schema: {
        tags: ['gastos'],
        summary: 'Gastos do gato num mês (padrão: mês atual)',
        security: [{ sessao: [] }],
        params: ParamsGato,
        querystring: z.object({ mes: MesISO.optional() }),
        response: { 200: GastosDoMes },
      },
    },
    async (request) => {
      await garantirGato(request.params.id);
      const mes = request.query.mes ?? mesDe(new Date());
      const { inicio, fimExclusivo } = intervaloDoMes(mes);
      const gastos = await prisma.gasto.findMany({
        where: {
          gatoId: request.params.id,
          data: { gte: inicio, lt: fimExclusivo },
        },
        include: includeGasto,
        orderBy: [{ data: 'desc' }, { criadoEm: 'desc' }],
      });
      return {
        mes,
        totalCentavos: gastos.reduce((soma, g) => soma + g.valorCentavos, 0),
        itens: gastos.map(toGasto),
      };
    },
  );

  app.post(
    '/:id/gastos',
    {
      schema: {
        tags: ['gastos'],
        summary: 'Lança um gasto do gato',
        security: [{ sessao: [] }],
        params: ParamsGato,
        body: z.object(campos),
        response: { 201: Gasto },
      },
    },
    async (request, reply) => {
      await garantirGato(request.params.id);
      const gasto = await prisma.gasto.create({
        data: {
          ...request.body,
          data: paraData(request.body.data),
          gatoId: request.params.id,
          registradoPorId: request.usuario?.id,
        },
        include: includeGasto,
      });
      await notificarSemFalhar(request.log, () =>
        notificarGastoNovo(prisma, gasto),
      );
      return reply.status(201).send(toGasto(gasto));
    },
  );

  app.patch(
    '/:id/gastos/:gastoId',
    {
      onRequest: exigirCargo('adm'),
      schema: {
        tags: ['gastos'],
        summary: 'Corrige um gasto (só adm)',
        security: [{ sessao: [] }],
        params: ParamsGasto,
        body: z.object(campos).partial(),
        response: { 200: Gasto },
      },
    },
    async (request) => {
      const atual = await buscarGasto(
        request.params.id,
        request.params.gastoId,
      );
      const { data, ...resto } = request.body;
      const gasto = await prisma.gasto.update({
        where: { id: atual.id },
        data: { ...resto, ...(data && { data: paraData(data) }) },
        include: includeGasto,
      });
      return toGasto(gasto);
    },
  );

  app.delete(
    '/:id/gastos/:gastoId',
    {
      onRequest: exigirCargo('adm'),
      schema: {
        tags: ['gastos'],
        summary: 'Exclui um gasto (só adm)',
        security: [{ sessao: [] }],
        params: ParamsGasto,
      },
    },
    async (request, reply) => {
      const atual = await buscarGasto(
        request.params.id,
        request.params.gastoId,
      );
      await prisma.gasto.delete({ where: { id: atual.id } });
      return reply.status(204).send();
    },
  );
};
