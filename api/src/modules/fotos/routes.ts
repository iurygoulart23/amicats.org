import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { HttpError, naoEncontrado } from '../../lib/errors.js';
import { exigirCargo } from '../../plugins/auth.js';
import { ParamsGato, removerDoStorage } from '../gatos/routes.js';
import { Foto } from '../gatos/schemas.js';
import type { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

const EXTENSOES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};

const ParamsFoto = ParamsGato.extend({ fotoId: z.uuid() });

const toFoto = ({ id, url, ordem, capa }: z.infer<typeof Foto>) => ({
  id,
  url,
  ordem,
  capa,
});

/** Garante exatamente uma capa quando o gato tem fotos. */
async function garantirCapa(prisma: PrismaClient, gatoId: string) {
  const temCapa = await prisma.gatoFoto.count({
    where: { gatoId, capa: true },
  });
  if (temCapa) return;
  const primeira = await prisma.gatoFoto.findFirst({
    where: { gatoId },
    orderBy: { ordem: 'asc' },
  });
  if (primeira)
    await prisma.gatoFoto.update({
      where: { id: primeira.id },
      data: { capa: true },
    });
}

export const fotosRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma, storage } = app.deps;
  app.addHook('onRequest', exigirCargo('voluntario'));

  async function garantirGato(id: string) {
    const gato = await prisma.gato.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!gato) throw naoEncontrado('Gato');
  }

  app.post(
    '/:id/fotos/upload-url',
    {
      schema: {
        tags: ['fotos'],
        summary:
          'Gera uma URL temporária para o navegador enviar a foto direto ao bucket',
        description:
          'Fluxo: 1) pedir a URL aqui; 2) fazer PUT do arquivo na uploadUrl com o mesmo Content-Type; 3) confirmar em POST /gatos/:id/fotos com a key.',
        security: [{ sessao: [] }],
        params: ParamsGato,
        body: z.object({
          contentType: z.enum(
            Object.keys(EXTENSOES) as [string, ...Array<string>],
            {
              error: 'Envie uma imagem JPG, PNG, WEBP ou HEIC.',
            },
          ),
        }),
        response: {
          200: z.object({
            uploadUrl: z.string(),
            key: z.string(),
            publicUrl: z.string(),
          }),
        },
      },
    },
    async (request) => {
      await garantirGato(request.params.id);
      const { contentType } = request.body;
      const key = `gatos/${request.params.id}/${randomUUID()}.${EXTENSOES[contentType]}`;
      return storage.criarUrlUpload(key, contentType);
    },
  );

  app.post(
    '/:id/fotos',
    {
      schema: {
        tags: ['fotos'],
        summary:
          'Registra a foto enviada (key do upload) ou uma foto já hospedada (url)',
        security: [{ sessao: [] }],
        params: ParamsGato,
        body: z.union([
          z.object({ key: z.string().min(1) }),
          z.object({ url: z.url() }),
        ]),
        response: { 201: Foto },
      },
    },
    async (request, reply) => {
      const gatoId = request.params.id;
      await garantirGato(gatoId);

      let storageKey: string | null = null;
      let url: string;
      if ('key' in request.body) {
        storageKey = request.body.key;
        if (
          !storageKey.startsWith(`gatos/${gatoId}/`) ||
          storageKey.includes('..')
        ) {
          throw new HttpError(400, 'Arquivo não pertence a este gato.');
        }
        url = storage.urlPublica(storageKey);
      } else {
        url = request.body.url;
      }

      const ultima = await prisma.gatoFoto.findFirst({
        where: { gatoId },
        orderBy: { ordem: 'desc' },
      });
      const foto = await prisma.gatoFoto.create({
        data: {
          gatoId,
          storageKey,
          url,
          ordem: ultima ? ultima.ordem + 1 : 0,
          capa: !ultima,
        },
      });
      return reply.status(201).send(toFoto(foto));
    },
  );

  app.patch(
    '/:id/fotos/:fotoId',
    {
      schema: {
        tags: ['fotos'],
        summary: 'Define a capa ou muda a ordem da foto',
        security: [{ sessao: [] }],
        params: ParamsFoto,
        body: z.object({
          capa: z.literal(true).optional(),
          ordem: z.number().int().min(0).optional(),
        }),
        response: { 200: Foto },
      },
    },
    async (request) => {
      const { id: gatoId, fotoId } = request.params;
      const foto = await prisma.gatoFoto.findFirst({
        where: { id: fotoId, gatoId },
      });
      if (!foto) throw naoEncontrado('Foto');

      const atualizada = await prisma.$transaction(async (tx) => {
        if (request.body.capa) {
          await tx.gatoFoto.updateMany({
            where: { gatoId, NOT: { id: fotoId } },
            data: { capa: false },
          });
        }
        return tx.gatoFoto.update({
          where: { id: fotoId },
          data: request.body,
        });
      });
      return toFoto(atualizada);
    },
  );

  app.delete(
    '/:id/fotos/:fotoId',
    {
      schema: {
        tags: ['fotos'],
        security: [{ sessao: [] }],
        params: ParamsFoto,
      },
    },
    async (request, reply) => {
      const { id: gatoId, fotoId } = request.params;
      const foto = await prisma.gatoFoto.findFirst({
        where: { id: fotoId, gatoId },
      });
      if (!foto) throw naoEncontrado('Foto');

      await prisma.gatoFoto.delete({ where: { id: foto.id } });
      await garantirCapa(prisma, gatoId);
      if (foto.storageKey) await removerDoStorage(app, [foto.storageKey]);
      return reply.status(204).send();
    },
  );
};
