import { expect, test } from '@playwright/test';
import {
  cadastrar,
  campo,
  emailUnico,
  entrar,
  tokenDoUltimoEmail,
} from './apoio';

test('cargos, convite de voluntário, cadastro de gato e catálogo público', async ({
  browser,
  request,
}) => {
  const sufixo = Date.now();
  const nomeGato = `Biscoito ${sufixo}`;
  const emailVol = emailUnico('voluntaria');
  const adm = await (await browser.newContext()).newPage();
  const vol = await (await browser.newContext()).newPage();
  const cli = await (await browser.newContext()).newPage();

  await test.step('anônimo em /app/gatos vai para o login e volta depois de entrar', async () => {
    await adm.goto('/pt-BR/app/gatos');
    await expect(adm).toHaveURL(/\/app\/login\?redirect=/);
    await campo(adm, 'E-mail').fill('admin@amicats.org');
    await campo(adm, 'Senha').fill('troque-esta-senha');
    await adm.getByRole('button', { name: 'Entrar' }).click();
    await expect(adm).toHaveURL(/\/app\/gatos$/);
    await expect(adm.getByRole('link', { name: 'Zezinho' })).toBeVisible();
  });

  await test.step('adm cria uma voluntária, que recebe convite por e-mail', async () => {
    await adm.goto('/pt-BR/app/admin/usuarios');
    await adm.getByRole('button', { name: 'Adicionar pessoa' }).click();
    await campo(adm, 'Nome').fill('Voluntária E2E');
    await campo(adm, 'E-mail').fill(emailVol);
    await adm.getByRole('button', { name: 'Criar e enviar convite' }).click();
    await expect(
      adm.getByRole('link', { name: 'Voluntária E2E' }).first(),
    ).toBeVisible();
  });

  await test.step('voluntária define a senha pelo link do convite', async () => {
    const token = await tokenDoUltimoEmail(request, emailVol);
    await vol.goto(`/pt-BR/app/redefinir-senha?token=${token}`);
    await campo(vol, 'Nova senha').fill('senha-da-vol-123');
    await vol.getByRole('button', { name: 'Salvar senha' }).click();
    await expect(vol.getByText('Senha definida!')).toBeVisible();
  });

  await test.step('voluntária entra sem o menu de administração', async () => {
    await entrar(vol, emailVol, 'senha-da-vol-123');
    await expect(vol.getByRole('heading', { name: /Olá/ })).toBeVisible();
    await expect(vol.getByRole('link', { name: 'Pessoas' })).toHaveCount(0);
  });

  await test.step('voluntária cadastra e publica um gato', async () => {
    await vol.goto('/pt-BR/app/gatos/novo');
    await campo(vol, 'Nome').fill(nomeGato);
    await campo(vol, 'Descrição para o site (português)').fill(
      'Gato de teste ponta a ponta.',
    );
    await campo(vol, 'Observações internas').fill('segredo interno e2e');
    await campo(vol, 'Publicado no site').check();
    await vol.getByRole('button', { name: 'Salvar' }).click();
    await expect(vol).toHaveURL(/aba=fotos/);
    await expect(vol.getByText('Nenhuma foto ainda.')).toBeVisible();
  });

  await test.step('marca tags atuais e passadas', async () => {
    await vol.getByRole('tab', { name: 'Tags' }).click();
    await vol
      .getByRole('radiogroup', { name: 'FIV' })
      .getByLabel('Tem hoje')
      .check();
    await vol
      .getByRole('radiogroup', { name: 'Giardíase' })
      .getByLabel('Já teve')
      .check();
    await vol.getByRole('button', { name: 'Salvar tags' }).click();
    await expect(vol.getByText('Tags salvas.')).toBeVisible();
  });

  await test.step('registra uma doença no histórico de saúde', async () => {
    await vol.getByRole('tab', { name: 'Saúde' }).click();
    await campo(vol, 'Doença ou condição').fill('Giardíase em 2025');
    await campo(vol, 'Início').fill('2025-02-01');
    await campo(vol, 'Fim').fill('2025-03-01');
    await campo(vol, 'Observação').fill('Tratada com metronidazol.');
    await vol.getByRole('button', { name: 'Salvar' }).click();
    await expect(
      vol.getByRole('heading', { name: /Giardíase em 2025/ }),
    ).toBeVisible();
    await expect(vol.getByText('Encerrado')).toBeVisible();
  });

  await test.step('voluntária é barrada na administração', async () => {
    await vol.goto('/pt-BR/app/admin/usuarios');
    await expect(vol).toHaveURL(/\/app$/);
  });

  await test.step('cliente se cadastra e é barrado na gestão de gatos', async () => {
    await cadastrar(cli, 'Cliente E2E');
    await expect(
      cli.getByRole('heading', { name: /Clube Amicats/ }),
    ).toBeVisible();
    await cli.goto('/pt-BR/app/gatos');
    await expect(cli).toHaveURL(/\/app$/);
  });

  await test.step('home pública mostra o gato novo sem vazar observações internas', async () => {
    const pub = await (await browser.newContext()).newPage();
    await pub.goto('/pt-BR/');
    await expect(pub.getByText(nomeGato).first()).toBeAttached();
    expect(await pub.content()).not.toContain('segredo interno e2e');
  });

  await test.step('logout volta para o login', async () => {
    await adm.goto('/pt-BR/app');
    await adm.getByRole('button', { name: 'Sair' }).click();
    await expect(adm).toHaveURL(/\/app\/login/);
  });
});
