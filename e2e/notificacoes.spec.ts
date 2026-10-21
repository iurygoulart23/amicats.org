import { expect, test } from '@playwright/test';
import {
  API_URL,
  abrirNotificacao,
  cadastrar,
  campo,
  dataHoraNoAbrigo,
  horaNoAbrigo,
  paginaDoAdm,
  verificarPendencias,
} from './apoio';

test('sininho, avisos e resumo diário por e-mail', async ({
  browser,
  request,
}) => {
  const adm = await paginaDoAdm(browser);
  const madrinha = await (await browser.newContext()).newPage();
  let emailMadrinha = '';

  await test.step('madrinha apadrinha o Elvis e o adm é avisado', async () => {
    emailMadrinha = await cadastrar(
      madrinha,
      'Madrinha Notif',
      'madrinha-notif',
    );
    await madrinha.goto('/pt-BR/app/apadrinhar/elvis');
    await madrinha.getByRole('button', { name: 'Quero apadrinhar' }).click();
    await expect(madrinha).toHaveURL(/\/app\/apadrinhamentos\//);

    await adm.reload();
    await abrirNotificacao(adm, /Novo padrinho para Elvis/);
    await expect(adm).toHaveURL(/aba=gastos/);
    await expect(
      adm.locator('.badge', { hasText: 'Madrinha Notif' }),
    ).toBeVisible();
  });

  await test.step('gasto lançado avisa a madrinha (sininho e resumo por e-mail), que abre direto no extrato', async () => {
    await campo(adm, 'Descrição').fill('Consulta dermatológica');
    await campo(adm, 'Valor (R$)').fill('120,00');
    await adm.getByRole('button', { name: 'Lançar', exact: true }).click();
    await expect(
      adm.getByRole('cell', { name: /Consulta dermatológica/ }),
    ).toBeVisible();

    await madrinha.goto('/pt-BR/app');
    await expect(
      madrinha.locator('summary[aria-label="Notificações: 1 não lidas"]'),
    ).toBeVisible();

    // Enquanto não lida, a verificação de pendências manda o resumo diário por e-mail.
    await verificarPendencias(request);
    const emails = (await (
      await request.get(`${API_URL}/dev/emails`, {
        params: { para: emailMadrinha },
      })
    ).json()) as Array<{ assunto: string; texto: string }>;
    const resumo = emails.find(
      (e) => e.assunto === 'Você tem 1 novidade na Amicats',
    );
    expect(resumo?.texto).toContain('Novo gasto com Elvis');

    await abrirNotificacao(madrinha, /Novo gasto com Elvis/);
    await expect(madrinha).toHaveURL(/\/app\/apadrinhamentos\/[\w-]+$/);
    await expect(
      madrinha.getByRole('cell', { name: 'Consulta dermatológica' }),
    ).toBeVisible();
  });

  await test.step('dose atrasada avisa a equipe e leva aos remédios do dia', async () => {
    // Doses de hora em hora a partir de 3 h atrás; perto da meia-noite não há dose "de hoje" atrasada.
    test.skip(
      horaNoAbrigo() < 1,
      'entre 00:00 e 01:00 no abrigo ainda não há dose atrasada no dia',
    );
    await adm.goto('/pt-BR/app/gatos');
    await adm.getByRole('link', { name: 'Raul' }).click();
    await adm.getByRole('tab', { name: 'Medicação' }).click();
    await campo(adm, 'Medicamento').fill('Prednisolona');
    await campo(adm, 'Dose').fill('1 comprimido');
    await campo(adm, 'Frequência').selectOption('4');
    await campo(adm, 'Primeira dose').fill(
      dataHoraNoAbrigo(new Date(Date.now() - 3 * 3600e3)),
    );
    await adm.getByRole('button', { name: 'Prescrever' }).click();
    await expect(
      adm.getByRole('heading', { name: /Prednisolona/ }),
    ).toBeVisible();

    const resultado = await verificarPendencias(request);
    expect(resultado.dosesAtrasadas).toBeGreaterThan(0);
    await adm.reload();
    await abrirNotificacao(adm, /Dose atrasada: Raul — Prednisolona/);
    await expect(adm).toHaveURL(/\/app\/remedios/);
  });

  await test.step('página de notificações e opção de e-mail salva', async () => {
    await madrinha.goto('/pt-BR/app/notificacoes');
    await expect(
      madrinha.getByRole('button', { name: /Novo gasto com Elvis/ }),
    ).toBeVisible();
    await madrinha.goto('/pt-BR/app/minha-conta');
    await madrinha.getByLabel(/resumo diário/).uncheck();
    await madrinha.getByRole('button', { name: 'Salvar' }).first().click();
    await expect(madrinha.getByText('Dados salvos.')).toBeVisible();
    await madrinha.reload();
    await expect(madrinha.getByLabel(/resumo diário/)).not.toBeChecked();
  });
});
