import {
  diaNoAbrigo,
  dosesPrevistas,
  intervaloDoDiaNoAbrigo,
} from '../../domain/medicacao.js';
import { deData, paraData } from '../../lib/datas.js';
import { notificar } from './notificar.js';
import type { AppDeps } from '../../app.js';
import type { NovaNotificacao } from './notificar.js';

const MINUTO_MS = 60 * 1000;
const DIA_MS = 24 * 60 * MINUTO_MS;
/** Tolerância antes de uma dose contar como atrasada. */
const TOLERANCIA_DOSE_MS = 30 * MINUTO_MS;
/** Antecedência do aviso de retorno. */
const DIAS_AVISO_RETORNO = 2;
/** Retornos vencidos há mais tempo que isso não geram mais aviso. */
const DIAS_RETORNO_ESQUECIDO = 60;
/** Intervalo mínimo entre dois resumos por e-mail para a mesma pessoa. */
const INTERVALO_RESUMO_MS = 20 * 60 * MINUTO_MS;
const MAX_ITENS_RESUMO = 10;

const horaNoAbrigo = (instante: Date) =>
  new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Campo_Grande',
  }).format(instante);

const dataBr = (dia: string) => dia.split('-').reverse().join('/');

async function equipeAtiva({ prisma }: AppDeps) {
  const equipe = await prisma.user.findMany({
    where: { cargo: { in: ['voluntario', 'adm'] }, ativo: true },
    select: { id: true },
  });
  return equipe.map((u) => u.id);
}

async function avisarDosesAtrasadas(
  deps: AppDeps,
  agora: Date,
  equipe: Array<string>,
) {
  const { inicio } = intervaloDoDiaNoAbrigo(diaNoAbrigo(agora));
  const limite = new Date(agora.getTime() - TOLERANCIA_DOSE_MS);
  if (limite <= inicio) return 0;

  const prescricoes = await deps.prisma.prescricao.findMany({
    where: {
      inicio: { lte: limite },
      AND: [
        { OR: [{ fim: null }, { fim: { gte: inicio } }] },
        { OR: [{ encerradaEm: null }, { encerradaEm: { gt: inicio } }] },
      ],
      gato: { status: { notIn: ['adotado', 'falecido'] } },
    },
    include: {
      gato: { select: { nome: true } },
      aplicacoes: {
        where: { horarioPrevisto: { gte: inicio } },
        select: { horarioPrevisto: true },
      },
    },
  });

  const avisos: Array<NovaNotificacao> = [];
  for (const p of prescricoes) {
    const registradas = new Set(
      p.aplicacoes.map((a) => a.horarioPrevisto.getTime()),
    );
    // +1 ms: inclui a dose prevista exatamente no limite da tolerância.
    for (const dose of dosesPrevistas(
      p,
      inicio,
      new Date(limite.getTime() + 1),
    )) {
      if (registradas.has(dose.getTime())) continue;
      for (const userId of equipe) {
        avisos.push({
          userId,
          tipo: 'dose_atrasada',
          titulo: `Dose atrasada: ${p.gato.nome} — ${p.medicamento}`,
          mensagem: `Prevista para ${horaNoAbrigo(dose)}`,
          link: '/app/remedios',
          chave: `dose:${p.id}:${dose.toISOString()}`,
        });
      }
    }
  }
  return notificar(deps.prisma, avisos);
}

async function avisarRetornos(
  deps: AppDeps,
  agora: Date,
  equipe: Array<string>,
) {
  const hoje = paraData(diaNoAbrigo(agora));
  const eventos = await deps.prisma.eventoVeterinario.findMany({
    where: {
      proximaData: {
        gte: new Date(hoje.getTime() - DIAS_RETORNO_ESQUECIDO * DIA_MS),
        lte: new Date(hoje.getTime() + DIAS_AVISO_RETORNO * DIA_MS),
      },
      gato: { status: { notIn: ['adotado', 'falecido'] } },
    },
    include: { gato: { select: { nome: true } } },
  });

  return notificar(
    deps.prisma,
    eventos.flatMap((e) => {
      const dia = deData(e.proximaData!);
      return equipe.map((userId) => ({
        userId,
        tipo: 'retorno_proximo' as const,
        titulo: `Retorno de ${e.gato.nome}: ${e.titulo}`,
        mensagem: `Marcado para ${dataBr(dia)}`,
        link: `/app/gatos/${e.gatoId}?aba=veterinario`,
        chave: `retorno:${e.id}:${dia}`,
      }));
    }),
  );
}

async function enviarResumos(deps: AppDeps, agora: Date) {
  const { prisma, mailer, env } = deps;
  const pessoas = await prisma.user.findMany({
    where: {
      ativo: true,
      notificarPorEmail: true,
      notificacoes: { some: { lidaEm: null, emailEnviadoEm: null } },
    },
    select: { id: true, nome: true, email: true },
  });

  let enviados = 0;
  for (const pessoa of pessoas) {
    const ultimo = await prisma.notificacao.findFirst({
      where: { userId: pessoa.id, emailEnviadoEm: { not: null } },
      orderBy: { emailEnviadoEm: 'desc' },
      select: { emailEnviadoEm: true },
    });
    if (
      ultimo?.emailEnviadoEm &&
      agora.getTime() - ultimo.emailEnviadoEm.getTime() < INTERVALO_RESUMO_MS
    ) {
      continue;
    }

    const pendentes = await prisma.notificacao.findMany({
      where: { userId: pessoa.id, lidaEm: null, emailEnviadoEm: null },
      orderBy: { criadoEm: 'desc' },
    });
    const n = pendentes.length;
    const itens = pendentes
      .slice(0, MAX_ITENS_RESUMO)
      .map((p) => `• ${p.titulo}${p.mensagem ? ` — ${p.mensagem}` : ''}`)
      .join('\n');
    const mais =
      n > MAX_ITENS_RESUMO ? `\n…e mais ${n - MAX_ITENS_RESUMO}.` : '';

    await mailer.enviar({
      para: pessoa.email,
      assunto:
        n === 1
          ? 'Você tem 1 novidade na Amicats'
          : `Você tem ${n} novidades na Amicats`,
      texto: `Olá, ${pessoa.nome}!\n\n${itens}${mais}\n\nVeja tudo em: ${env.WEB_ORIGIN}/pt-BR/app/notificacoes\n\nPara não receber este resumo, desligue a opção em "Minha conta".`,
    });
    await prisma.notificacao.updateMany({
      where: { id: { in: pendentes.map((p) => p.id) } },
      data: { emailEnviadoEm: agora },
    });
    enviados++;
  }
  return enviados;
}

/** Procura doses atrasadas e retornos, gera notificações e envia os resumos do dia. */
export async function verificarPendencias(deps: AppDeps, agora: Date) {
  const equipe = await equipeAtiva(deps);
  const dosesAtrasadas = await avisarDosesAtrasadas(deps, agora, equipe);
  const retornos = await avisarRetornos(deps, agora, equipe);
  const emails = await enviarResumos(deps, agora);
  return { dosesAtrasadas, retornos, emails };
}
