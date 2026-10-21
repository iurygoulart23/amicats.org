import { expect, test } from '@playwright/test';
import { API_URL, campo, emailUnico, paginaDoAdm } from './apoio';

test('visitante sem conta doa pelo checkout simulado do Mercado Pago', async ({
  page,
  browser,
  request,
}) => {
  const email = emailUnico('doadora');

  await test.step('chega à página de doação pelo "Quero ajudar"', async () => {
    await page.goto('/pt-BR/quero-ajudar/');
    await page.getByRole('link', { name: /Doar online/ }).click();
    await expect(page).toHaveURL(/\/pt-BR\/doar\/?$/);
    // Nome e e-mail só aparecem no navegador (depois de saber que não há login):
    // a página já está hidratada e os botões respondem.
    await expect(campo(page, 'Nome')).toBeVisible();
  });

  await test.step('outro valor abaixo do mínimo não deixa doar', async () => {
    await page.getByRole('button', { name: 'Outro valor' }).click();
    await campo(page, 'Quanto você quer doar (R$)').fill('4,00');
    await expect(page.getByRole('button', { name: /^Doar/ })).toBeDisabled();
  });

  await test.step('escolhe R$ 50,00, informa nome e e-mail e vai ao checkout', async () => {
    await page.getByRole('button', { name: 'R$ 50,00' }).click();
    await campo(page, 'Nome').fill('Doadora E2E');
    await campo(page, 'E-mail').fill(email);
    await page.getByRole('button', { name: 'Doar R$ 50,00' }).click();
    await expect(page).toHaveURL(/\/dev\/mercadopago\/checkout\//);
    await expect(
      page.getByRole('heading', { name: 'Doação para a Amicats' }),
    ).toBeVisible();
  });

  await test.step('paga e volta para a página de obrigado', async () => {
    await page
      .getByRole('button', { name: 'Simular pagamento aprovado' })
      .click();
    await expect(page).toHaveURL(/\/pt-BR\/doar\/obrigado\?doacao=/);
    await expect(
      page.getByText('Recebemos a sua doação de R$ 50,00.'),
    ).toBeVisible();
  });

  await test.step('recebe o agradecimento por e-mail e os adms são avisados', async () => {
    const emails = (await (
      await request.get(`${API_URL}/dev/emails`, { params: { para: email } })
    ).json()) as Array<{ assunto: string }>;
    expect(emails.map((e) => e.assunto)).toEqual([
      'Obrigado pela sua doação à Amicats',
    ]);

    const adm = await paginaDoAdm(browser);
    await adm.goto('/pt-BR/app/notificacoes');
    await expect(
      adm.getByText('Doação recebida: R$ 50,00').first(),
    ).toBeVisible();
  });
});
