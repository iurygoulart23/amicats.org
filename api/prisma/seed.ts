// Seed idempotente: pode rodar várias vezes sem duplicar nem sobrescrever o que
// já foi editado pelo painel (gatos e tags existentes são mantidos como estão).
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { slugify } from '../src/domain/gato.js';
import { hashSenha } from '../src/lib/password.js';

type GatoSeed = {
  nome: string;
  descricaoPt: string;
  descricaoEn: string;
  sexo: string;
  foto: string;
};

const TAGS_DOENCA = [
  'FIV',
  'FeLV',
  'Esporotricose',
  'Rinotraqueíte',
  'Giardíase',
  'Dermatite',
  'Doença renal',
  'Gengivite',
];

const prisma = new PrismaClient();

async function seedAdm() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const senha = process.env.SEED_ADMIN_SENHA;
  if (!email || !senha) {
    console.warn(
      'SEED_ADMIN_EMAIL/SEED_ADMIN_SENHA não definidos: adm inicial não criado.',
    );
    return;
  }
  const existente = await prisma.user.findUnique({ where: { email } });
  if (existente) return;
  await prisma.user.create({
    data: {
      nome: 'Administração Amicats',
      email,
      cargo: 'adm',
      senhaHash: await hashSenha(senha),
    },
  });
  console.info(`adm criado: ${email}`);
}

async function seedTags() {
  for (const nome of TAGS_DOENCA) {
    await prisma.tag.upsert({
      where: { nome },
      update: {},
      create: { nome, tipo: 'doenca' },
    });
  }
}

async function seedGatos() {
  const gatos = JSON.parse(
    readFileSync(new URL('./seed-gatos.json', import.meta.url), 'utf8'),
  ) as Array<GatoSeed>;

  let criados = 0;
  for (const g of gatos) {
    const slug = slugify(g.nome);
    if (await prisma.gato.findUnique({ where: { slug } })) continue;
    await prisma.gato.create({
      data: {
        nome: g.nome,
        slug,
        sexo: g.sexo,
        descricaoPt: g.descricaoPt,
        descricaoEn: g.descricaoEn,
        publicado: true,
        fotos: { create: { url: g.foto, capa: true, ordem: 0 } },
      },
    });
    criados++;
  }
  console.info(
    `gatos: ${criados} criados, ${gatos.length - criados} já existiam`,
  );
}

/** Faixas iniciais do Clube Amicats (nomes provisórios; o adm edita no painel). */
async function seedFaixasClube() {
  if ((await prisma.planoClube.count()) > 0) return;
  await prisma.planoClube.createMany({
    data: [
      { nome: 'Amigo', valorCentavos: 2000, ordem: 1 },
      { nome: 'Protetor', valorCentavos: 5000, ordem: 2 },
      { nome: 'Guardião', valorCentavos: 10000, ordem: 3 },
    ],
  });
  console.info('faixas do clube criadas');
}

try {
  await seedAdm();
  await seedTags();
  await seedGatos();
  await seedFaixasClube();
} finally {
  await prisma.$disconnect();
}
