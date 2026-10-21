import { devices, expect, test } from '@playwright/test';
import { campo, diaNoAbrigo, paginaDoAdm } from './apoio';

test('prescrição, remédios do dia e retornos veterinários', async ({
  browser,
}) => {
  // Navegador em outro fuso: os horários continuam no horário do abrigo.
  const page = await paginaDoAdm(browser, { timezoneId: 'America/Sao_Paulo' });
  const linhas = page.locator('li.card', { hasText: 'Amoxicilina 50mg' });

  await test.step('prescreve remédio de 12 em 12 horas para o Mario', async () => {
    await page.goto('/pt-BR/app/gatos');
    await page.getByRole('link', { name: 'Mario' }).click();
    await page.getByRole('tab', { name: 'Medicação' }).click();
    await campo(page, 'Medicamento').fill('Amoxicilina 50mg');
    await campo(page, 'Dose').fill('1/2 comprimido');
    await campo(page, 'Primeira dose').fill(`${diaNoAbrigo()}T08:00`);
    await campo(page, 'Última dose').fill(`${diaNoAbrigo(6)}T20:00`);
    await page.getByRole('button', { name: 'Prescrever' }).click();
    await expect(
      page.getByRole('heading', { name: /Amoxicilina 50mg/ }),
    ).toBeVisible();
    await expect(page.getByText('A cada 12h').first()).toBeVisible();
  });

  await test.step('registra vacina com retorno em 5 dias', async () => {
    await page.getByRole('tab', { name: 'Veterinário' }).click();
    await campo(page, 'Tipo').selectOption('vacina');
    await campo(page, 'Título').fill('V4 — 1ª dose');
    await campo(page, 'Retorno (opcional)').fill(diaNoAbrigo(5));
    await page.getByRole('button', { name: 'Salvar' }).click();
    await expect(
      page.getByRole('heading', { name: /V4 — 1ª dose/ }),
    ).toBeVisible();
  });

  await test.step('remédios do dia mostram as doses às 08:00 e 20:00 do abrigo', async () => {
    await page.getByRole('link', { name: 'Remédios do dia' }).first().click();
    await expect(page).toHaveURL(/\/app\/remedios/);
    await expect(linhas).toHaveCount(2);
    await expect(linhas.locator('.tabular-nums')).toHaveText([
      '08:00',
      '20:00',
    ]);
  });

  await test.step('"Dei", "Pular" com motivo e desfazer', async () => {
    await linhas.nth(0).getByRole('button', { name: 'Dei' }).click();
    await expect(linhas.nth(0).getByText('Dada')).toBeVisible();

    page.once('dialog', (d) => void d.accept('Recusou'));
    await linhas.nth(1).getByRole('button', { name: 'Pular dose' }).click();
    await expect(linhas.nth(1).getByText('Pulada')).toBeVisible();
    await expect(linhas.nth(1).getByText(/Recusou/)).toBeVisible();

    await linhas
      .nth(1)
      .getByRole('button', { name: 'Desfazer registro' })
      .click();
    await expect(
      linhas.nth(1).getByRole('button', { name: 'Dei' }),
    ).toBeVisible();
  });

  await test.step('o retorno da vacina aparece em "Retornos e vacinas"', async () => {
    await expect(
      page
        .locator('li', { hasText: 'V4 — 1ª dose' })
        .filter({ hasText: 'Mario' })
        .first(),
    ).toBeVisible();
  });
});

test('remédios do dia cabem na tela do celular', async ({ browser }) => {
  const page = await paginaDoAdm(browser, { ...devices['Pixel 5'] });
  await page.goto('/pt-BR/app/remedios');
  await expect(
    page.getByRole('heading', { name: 'Remédios do dia' }),
  ).toBeVisible();
  const largura = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(largura).toBeLessThanOrEqual(page.viewportSize()!.width);
});
