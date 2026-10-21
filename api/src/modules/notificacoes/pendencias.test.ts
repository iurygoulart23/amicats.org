import { afterEach, describe, expect, it } from 'vitest';
import { createTestApp, logarComo, prisma } from '../../../test/helpers.js';

let ctx: Awaited<ReturnType<typeof createTestApp>>;
let agora = new Date('2026-10-21T13:00:00Z'); // 09:00 em Campo Grande

async function iniciar() {
  ctx = await createTestApp({ agora: () => agora });
}
afterEach(async () => {
  await ctx.app.close();
  agora = new Date('2026-10-21T13:00:00Z');
});

const verificar = (token = 'token-de-teste') =>
  ctx.app.inject({
    method: 'POST',
    url: '/tarefas/verificar-pendencias',
    headers: { 'x-tarefa-token': token },
  });

const notificacoesDe = async (headers: { cookie: string }) =>
  (
    await ctx.app.inject({ method: 'GET', url: '/notificacoes', headers })
  ).json();

async function gatoComPrescricao() {
  const vol = await logarComo(ctx.app, 'voluntario');
  const gato = (
    await ctx.app.inject({
      method: 'POST',
      url: '/gatos',
      headers: vol.headers,
      payload: { nome: 'Pirelli' },
    })
  ).json();
  const prescricao = (
    await ctx.app.inject({
      method: 'POST',
      url: `/gatos/${gato.id}/prescricoes`,
      headers: vol.headers,
      payload: {
        medicamento: 'Amoxicilina',
        dose: '1/2 comprimido',
        via: 'oral',
        intervaloHoras: 12,
        inicio: '2026-10-21T08:00:00-04:00',
      },
    })
  ).json();
  return { vol, gato, prescricao };
}

describe('verificação de pendências', () => {
  it('exige o token da tarefa', async () => {
    await iniciar();
    expect((await verificar('errado')).statusCode).toBe(401);
    expect(
      (
        await ctx.app.inject({
          method: 'POST',
          url: '/tarefas/verificar-pendencias',
        })
      ).statusCode,
    ).toBe(401);
  });

  it('avisa voluntários e adms de doses atrasadas há mais de 30 minutos, uma única vez', async () => {
    await iniciar();
    const { vol } = await gatoComPrescricao();
    const adm = await logarComo(ctx.app, 'adm');
    const cliente = await logarComo(ctx.app, 'cliente');

    const res = await verificar();
    expect(res.statusCode).toBe(200);
    await verificar();

    for (const headers of [vol.headers, adm.headers]) {
      expect(await notificacoesDe(headers)).toEqual([
        expect.objectContaining({
          tipo: 'dose_atrasada',
          titulo: 'Dose atrasada: Pirelli — Amoxicilina',
          mensagem: 'Prevista para 08:00',
          link: '/app/remedios',
        }),
      ]);
    }
    expect(await notificacoesDe(cliente.headers)).toEqual([]);
  });

  it('dose já registrada ou ainda dentro da tolerância não gera aviso', async () => {
    agora = new Date('2026-10-21T12:20:00Z'); // 08:20: só 20 min de atraso
    await iniciar();
    const { vol, prescricao } = await gatoComPrescricao();
    await verificar();
    expect(await notificacoesDe(vol.headers)).toEqual([]);

    await ctx.app.inject({
      method: 'POST',
      url: '/medicacao/aplicacoes',
      headers: vol.headers,
      payload: {
        prescricaoId: prescricao.id,
        horarioPrevisto: '2026-10-21T12:00:00.000Z',
      },
    });
    agora = new Date('2026-10-21T15:00:00Z');
    await verificar();
    expect(await notificacoesDe(vol.headers)).toEqual([]);
  });

  it('avisa de retornos atrasados ou nos próximos 2 dias', async () => {
    await iniciar();
    const vol = await logarComo(ctx.app, 'voluntario');
    const gato = (
      await ctx.app.inject({
        method: 'POST',
        url: '/gatos',
        headers: vol.headers,
        payload: { nome: 'Star' },
      })
    ).json();
    const evento = (proximaData: string, titulo: string) =>
      ctx.app.inject({
        method: 'POST',
        url: `/gatos/${gato.id}/veterinario`,
        headers: vol.headers,
        payload: { tipo: 'vacina', titulo, data: '2026-09-01', proximaData },
      });
    await evento('2026-10-23', 'Reforço V4');
    await evento('2026-11-30', 'Antirrábica');

    await verificar();
    expect(await notificacoesDe(vol.headers)).toEqual([
      expect.objectContaining({
        tipo: 'retorno_proximo',
        titulo: 'Retorno de Star: Reforço V4',
        mensagem: 'Marcado para 23/10/2026',
        link: `/app/gatos/${gato.id}?aba=veterinario`,
      }),
    ]);
  });
});

describe('resumo por e-mail', () => {
  async function padrinhoComGasto(notificarPorEmail = true) {
    const adm = await logarComo(ctx.app, 'adm');
    const madrinha = await logarComo(ctx.app, 'cliente');
    if (!notificarPorEmail) {
      await ctx.app.inject({
        method: 'PATCH',
        url: '/auth/me',
        headers: madrinha.headers,
        payload: { notificarPorEmail: false },
      });
    }
    const gato = (
      await ctx.app.inject({
        method: 'POST',
        url: '/gatos',
        headers: adm.headers,
        payload: { nome: 'Raul', publicado: true },
      })
    ).json();
    await ctx.app.inject({
      method: 'POST',
      url: '/apadrinhamentos',
      headers: madrinha.headers,
      payload: { gatoId: gato.id },
    });
    const lancar = (descricao: string) =>
      ctx.app.inject({
        method: 'POST',
        url: `/gatos/${gato.id}/gastos`,
        headers: adm.headers,
        payload: {
          categoria: 'racao',
          descricao,
          valorCentavos: 5000,
          data: '2026-10-20',
        },
      });
    return { adm, madrinha, lancar };
  }

  it('envia no máximo um resumo por dia com as notificações não lidas', async () => {
    await iniciar();
    const { madrinha, lancar } = await padrinhoComGasto();
    await lancar('Ração');

    await verificar();
    const paraMadrinha = () =>
      ctx.mailer.enviados.filter((e) => e.para === madrinha.user.email);
    expect(paraMadrinha()).toHaveLength(1);
    expect(paraMadrinha()[0]).toMatchObject({
      assunto: 'Você tem 1 novidade na Amicats',
    });
    expect(paraMadrinha()[0]?.texto).toContain('Novo gasto com Raul');
    expect(paraMadrinha()[0]?.texto).toContain(
      'http://localhost:3000/pt-BR/app/notificacoes',
    );

    // Mesmo dia: nova notificação não gera outro e-mail.
    await lancar('Remédio');
    agora = new Date('2026-10-21T20:00:00Z');
    await verificar();
    expect(paraMadrinha()).toHaveLength(1);

    // No dia seguinte, manda o que ficou pendente.
    agora = new Date('2026-10-22T13:00:00Z');
    await verificar();
    expect(paraMadrinha()).toHaveLength(2);
    expect(paraMadrinha()[1]?.texto).toContain('Remédio');
  });

  it('não envia para quem desligou o resumo, nem notificações já lidas', async () => {
    await iniciar();
    const desligado = await padrinhoComGasto(false);
    await desligado.lancar('Ração');
    await verificar();
    expect(
      ctx.mailer.enviados.filter(
        (e) => e.para === desligado.madrinha.user.email,
      ),
    ).toHaveLength(0);

    await prisma.notificacao.deleteMany();
    const lida = await padrinhoComGasto();
    await lida.lancar('Areia');
    await ctx.app.inject({
      method: 'POST',
      url: '/notificacoes/ler-todas',
      headers: lida.madrinha.headers,
    });
    await verificar();
    expect(
      ctx.mailer.enviados.filter((e) => e.para === lida.madrinha.user.email),
    ).toHaveLength(0);
  });
});
