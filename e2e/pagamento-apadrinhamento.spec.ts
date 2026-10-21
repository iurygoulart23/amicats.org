import { expect, test } from '@playwright/test';
import {
  abrirNotificacao,
  cadastrar,
  paginaDoAdm,
  sql,
  verificarPendencias,
} from './apoio';

test('padrinho paga a parte do mês fechado pelo checkout simulado do Mercado Pago', async ({
  browser,
  request,
}) => {
  const padrinho = await (await browser.newContext()).newPage();
  const email = await cadastrar(padrinho, 'Padrinho Pagante', 'pagante');

  await test.step('apadrinha o Augusto', async () => {
    await padrinho.goto('/pt-BR/app/apadrinhar/augusto');
    await padrinho.getByRole('button', { name: 'Quero apadrinhar' }).click();
    await expect(padrinho).toHaveURL(/\/app\/apadrinhamentos\/[\w-]+$/);
    await expect(
      padrinho.getByText(/Este mês ainda está em andamento/),
    ).toBeVisible();
  });

  await test.step('preparo: apadrinha desde o mês passado, que teve R$ 80,00 de gastos', () => {
    // A interface não deixa voltar no tempo: ajusta direto no banco do e2e.
    sql(`UPDATE apadrinhamentos SET inicio = date_trunc('month', now()) - interval '1 month'
         WHERE user_id = (SELECT id FROM users WHERE email = '${email}')`);
    sql(`INSERT INTO gastos (id, gato_id, categoria, descricao, valor_centavos, data, atualizado_em)
         SELECT gen_random_uuid(), id, 'racao', 'Ração do mês passado', 8000,
                date_trunc('month', now()) - interval '1 month' + interval '9 days', now()
         FROM gatos WHERE slug = 'augusto'`);
  });

  await test.step('a verificação de pendências avisa o padrinho da parte do mês', async () => {
    expect((await verificarPendencias(request)).partes).toBeGreaterThanOrEqual(
      1,
    );
    await padrinho.goto('/pt-BR/app');
    await abrirNotificacao(padrinho, /Sua parte de Augusto/);
    await expect(padrinho).toHaveURL(/\/app\/apadrinhamentos\/[\w-]+\?mes=/);
  });

  await test.step('"meus apadrinhamentos" mostra quanto falta pagar', async () => {
    await padrinho.goto('/pt-BR/app/apadrinhamentos');
    const card = padrinho.getByRole('link', { name: /Augusto/ });
    await expect(card).toContainText('Falta pagar: R$ 80,00');
    await card.click();
    await expect(padrinho).toHaveURL(/\?mes=\d{4}-\d{2}/);
  });

  await test.step('paga no checkout e volta para o extrato quitado', async () => {
    await padrinho.getByRole('button', { name: 'Pagar R$ 80,00' }).click();
    await expect(padrinho).toHaveURL(/\/dev\/mercadopago\/checkout\//);
    await expect(
      padrinho.getByRole('heading', { name: /Apadrinhamento de Augusto/ }),
    ).toBeVisible();
    await padrinho
      .getByRole('button', { name: 'Simular pagamento aprovado' })
      .click();

    await expect(padrinho).toHaveURL(/\/app\/apadrinhamentos\/[\w-]+\?mes=/);
    await expect(
      padrinho
        .locator('.stat', { hasText: 'Falta pagar' })
        .locator('.stat-value'),
    ).toContainText('0,00');
    await expect(padrinho.locator('.badge', { hasText: 'Pago' })).toBeVisible();
    await expect(padrinho.getByRole('button', { name: /^Pagar/ })).toHaveCount(
      0,
    );
  });

  await test.step('os adms são avisados do pagamento', async () => {
    const adm = await paginaDoAdm(browser);
    await adm.goto('/pt-BR/app/notificacoes');
    await expect(
      adm.getByText('Pagamento recebido: Augusto').first(),
    ).toBeVisible();
  });
});
