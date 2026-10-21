import { expect, test } from '@playwright/test';
import { cadastrar, paginaDoAdm } from './apoio';

test('histórico de pagamentos do cliente e conciliação do adm', async ({
  browser,
}) => {
  const cli = await (await browser.newContext()).newPage();
  const email = await cadastrar(cli, 'Pagante E2E', 'pagante');

  await test.step('sem pagamentos, "Meus pagamentos" sugere doar', async () => {
    await cli.getByRole('link', { name: 'Meus pagamentos' }).click();
    await expect(cli).toHaveURL(/\/app\/pagamentos$/);
    await expect(cli.getByText('Você ainda não tem pagamentos.')).toBeVisible();
  });

  await test.step('assina o Clube (Amigo) e doa R$ 100,00 logado', async () => {
    await cli.goto('/pt-BR/app/clube');
    await cli
      .locator('.card', { hasText: 'Amigo' })
      .getByRole('button', { name: 'Assinar' })
      .click();
    await cli
      .getByRole('button', { name: 'Simular pagamento aprovado' })
      .click();
    await expect(cli.locator('.badge', { hasText: 'Ativa' })).toBeVisible();

    await cli.goto('/pt-BR/doar');
    // "Doando como" só aparece no navegador: a página já está hidratada.
    await expect(cli.getByText(/Doando como Pagante E2E/)).toBeVisible();
    await cli.getByRole('button', { name: 'R$ 100,00' }).click();
    await cli.getByRole('button', { name: 'Doar R$ 100,00' }).click();
    await cli
      .getByRole('button', { name: 'Simular pagamento aprovado' })
      .click();
    await expect(
      cli.getByText('Recebemos a sua doação de R$ 100,00.'),
    ).toBeVisible();
  });

  await test.step('"Meus pagamentos" mostra a mensalidade e a doação', async () => {
    await cli.goto('/pt-BR/app/pagamentos');
    const doacao = cli.getByRole('row', { name: /Doação.*R\$ 100,00.*Pago/ });
    const clube = cli.getByRole('row', {
      name: /Clube Amicats.*Amigo.*R\$ 20,00.*Pago/,
    });
    await expect(doacao).toBeVisible();
    await expect(clube).toBeVisible();
  });

  await test.step('adm vê os dois pagamentos na conciliação e filtra por origem', async () => {
    const adm = await paginaDoAdm(browser);
    await adm.goto('/pt-BR/app/admin/pagamentos');
    await expect(
      adm.getByRole('heading', { name: 'Pagamentos' }),
    ).toBeVisible();
    const doPagante = adm.getByRole('row', { name: new RegExp(email) });
    await expect(doPagante).toHaveCount(2);

    await adm.getByLabel('Origem').selectOption({ label: 'Doação' });
    await expect(adm).toHaveURL(/tipo=doacao/);
    await expect(doPagante).toHaveCount(1);
    await expect(doPagante).toContainText('R$ 100,00');

    await adm
      .getByRole('button', { name: 'Reconsultar pendentes no Mercado Pago' })
      .click();
    await expect(adm.getByRole('status')).toContainText(
      /Nenhum pagamento pendente para consultar|pendentes consultados/,
    );
  });
});
