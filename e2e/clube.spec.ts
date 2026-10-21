import { expect, test } from '@playwright/test';
import { abrirNotificacao, paginaDoAdm, preencherCadastro } from './apoio';

test('assinatura do Clube Amicats com o checkout simulado do Mercado Pago', async ({
  browser,
}) => {
  const cli = await (await browser.newContext()).newPage();

  await test.step('"Assinar o Clube Amicats" no Quero Ajudar leva ao cadastro e volta ao clube', async () => {
    await cli.goto('/pt-BR/quero-ajudar/');
    await cli.getByRole('link', { name: 'Assinar o Clube Amicats' }).click();
    await expect(cli).toHaveURL(/\/app\/login\?redirect=.*clube/);
    await cli.getByRole('link', { name: 'Cadastre-se' }).click();
    await preencherCadastro(cli, 'Assinante E2E', 'assinante');
    await expect(cli).toHaveURL(/\/app\/clube$/);
  });

  await test.step('escolher a faixa Protetor (R$ 50) leva ao checkout do Mercado Pago', async () => {
    const protetor = cli.locator('.card', { hasText: 'Protetor' });
    await expect(protetor.getByText('R$ 50,00')).toBeVisible();
    await protetor.getByRole('button', { name: 'Assinar' }).click();
    await expect(cli).toHaveURL(/\/dev\/mercadopago\/checkout\//);
    await expect(cli.getByText('Clube Amicats — Protetor')).toBeVisible();
  });

  await test.step('quem não concluiu vê "Aguardando pagamento" com o botão para concluir', async () => {
    await cli.goto('/pt-BR/app/clube');
    await expect(cli.getByText('Aguardando pagamento')).toBeVisible();
    await cli.getByRole('link', { name: 'Concluir pagamento' }).click();
    await expect(cli).toHaveURL(/\/dev\/mercadopago\/checkout\//);
  });

  await test.step('pagamento aprovado: assinatura ativa e cobrança registrada', async () => {
    await cli
      .getByRole('button', { name: 'Simular pagamento aprovado' })
      .click();
    await expect(cli).toHaveURL(/\/app\/clube$/);
    await expect(cli.locator('.badge', { hasText: 'Ativa' })).toBeVisible();
    await expect(cli.getByRole('cell', { name: 'Aprovada' })).toBeVisible();
    await expect(cli.getByText(/Próxima cobrança em/)).toBeVisible();
  });

  await test.step('adm é avisado e vê o assinante no painel', async () => {
    const adm = await paginaDoAdm(browser);
    await abrirNotificacao(adm, /Nova assinatura do Clube: Protetor/);
    await expect(adm).toHaveURL(/\/app\/admin\/clube/);
    await expect(
      adm.getByRole('cell', { name: /Assinante E2E/ }),
    ).toBeVisible();
    await expect(
      adm.locator('.stat', { hasText: 'Receita mensal recorrente' }),
    ).toContainText('R$');
  });

  await test.step('assinante cancela e pode escolher uma faixa de novo', async () => {
    cli.once('dialog', (d) => void d.accept());
    await cli.getByRole('button', { name: 'Cancelar assinatura' }).click();
    await expect(cli.getByText(/Sua assinatura foi cancelada/)).toBeVisible();
    await expect(
      cli.getByRole('heading', { name: 'Escolha sua faixa' }),
    ).toBeVisible();
  });
});
