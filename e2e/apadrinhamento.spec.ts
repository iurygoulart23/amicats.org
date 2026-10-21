import { expect, test } from '@playwright/test';
import {
  botaoVisivelNaTela,
  cadastrar,
  campo,
  paginaDoAdm,
  preencherCadastro,
} from './apoio';
import type { Page } from '@playwright/test';

const suaParte = (page: Page) =>
  page.locator('.stat', { hasText: 'Sua parte' }).locator('.stat-value');

test('gastos do Zezinho divididos igualmente entre os padrinhos', async ({
  browser,
}) => {
  const madrinha = await (await browser.newContext()).newPage();
  const padrinho = await (await browser.newContext()).newPage();

  const adm = await paginaDoAdm(browser);

  await test.step('adm lança dois gastos: total do mês R$ 240,00', async () => {
    await adm.goto('/pt-BR/app/gatos');
    await adm.getByRole('link', { name: 'Zezinho' }).click();
    await adm.getByRole('tab', { name: 'Gastos' }).click();
    for (const [descricao, valor] of [
      ['Ração renal', '89,90'],
      ['Consulta', '150,10'],
    ]) {
      await campo(adm, 'Descrição').fill(descricao);
      await campo(adm, 'Valor (R$)').fill(valor);
      await adm.getByRole('button', { name: 'Lançar', exact: true }).click();
      await expect(
        adm.getByRole('cell', { name: new RegExp(descricao) }),
      ).toBeVisible();
    }
    await expect(adm.getByText('R$ 240,00').first()).toBeVisible();
  });

  await test.step('visitante clica em "Apadrinhe", se cadastra e volta para a página do gato', async () => {
    await madrinha.goto('/pt-BR/');
    await (await botaoVisivelNaTela(madrinha, 'Apadrinhe')).click();
    await expect(madrinha).toHaveURL(/\/app\/login\?redirect=.*apadrinhar/);
    await madrinha.getByRole('link', { name: 'Cadastre-se' }).click();
    await preencherCadastro(madrinha, 'Madrinha E2E', 'madrinha');
    await expect(madrinha).toHaveURL(/\/app\/apadrinhar\//);
  });

  await test.step('apadrinha o Zezinho e vê a parte de R$ 240,00', async () => {
    await madrinha.goto('/pt-BR/app/apadrinhar/zezinho');
    await madrinha.getByRole('button', { name: 'Quero apadrinhar' }).click();
    await expect(madrinha).toHaveURL(/\/app\/apadrinhamentos\/[\w-]+$/);
    await expect(suaParte(madrinha)).toContainText('240,00');
    await expect(
      madrinha.getByRole('cell', { name: 'Ração renal' }),
    ).toBeVisible();
  });

  await test.step('com um segundo padrinho, a parte de cada um cai para R$ 120,00', async () => {
    await cadastrar(padrinho, 'Padrinho Dois', 'padrinho');
    await padrinho.goto('/pt-BR/app/apadrinhar/zezinho');
    await padrinho.getByRole('button', { name: 'Quero apadrinhar' }).click();
    await expect(padrinho).toHaveURL(/\/app\/apadrinhamentos\/[\w-]+$/);
    await expect(suaParte(padrinho)).toContainText('120,00');
  });

  await test.step('apadrinhar o mesmo gato de novo mostra aviso', async () => {
    await padrinho.goto('/pt-BR/app/apadrinhar/zezinho');
    await padrinho.getByRole('button', { name: 'Quero apadrinhar' }).click();
    await expect(
      padrinho.getByText('Você já apadrinha este gatinho.'),
    ).toBeVisible();
  });

  await test.step('home mostra o selo "Apadrinhado" e a equipe vê os padrinhos', async () => {
    const pub = await (await browser.newContext()).newPage();
    await pub.goto('/pt-BR/');
    await expect(
      pub
        .locator('.card', { hasText: 'Zezinho' })
        .first()
        .getByText(/Apadrinhado/),
    ).toBeAttached();
    await adm.reload();
    await expect(
      adm.locator('.badge', { hasText: 'Madrinha E2E' }),
    ).toBeVisible();
  });

  await test.step('madrinha encerra o apadrinhamento', async () => {
    await madrinha.goto('/pt-BR/app/apadrinhamentos');
    await madrinha.getByRole('link', { name: /Zezinho/ }).click();
    madrinha.once('dialog', (d) => void d.accept());
    await madrinha
      .getByRole('button', { name: 'Encerrar apadrinhamento' })
      .click();
    await expect(madrinha.getByText('Encerrado').first()).toBeVisible();
  });
});
