import { execFileSync } from 'node:child_process';
import { expect } from '@playwright/test';
import type {
  APIRequestContext,
  Browser,
  BrowserContextOptions,
  Page,
} from '@playwright/test';

export const SITE_URL = 'http://localhost:3001';
export const API_URL = 'http://localhost:3334';
export const TOKEN_TAREFAS = 'token-e2e';
export const ADMIN = { email: 'admin@amicats.org', senha: 'troque-esta-senha' };
/** Sessão do adm salva pelo setup (e2e/adm.setup.ts). */
export const SESSAO_ADM = 'playwright/.auth/adm.json';

const FUSO_ABRIGO = 'America/Campo_Grande';

/** Campo de formulário pelo rótulo exato. */
export const campo = (page: Page, rotulo: string) =>
  page.getByLabel(rotulo, { exact: true });

export const emailUnico = (prefixo: string) =>
  `${prefixo}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@teste.org`;

export async function entrar(page: Page, email: string, senha: string) {
  await page.goto('/pt-BR/app/login');
  await campo(page, 'E-mail').fill(email);
  await campo(page, 'Senha').fill(senha);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/app$/);
}

export const entrarComoAdm = (page: Page) =>
  entrar(page, ADMIN.email, ADMIN.senha);

/** Página já logada como adm, reaproveitando a sessão do setup (sem novo login). */
export async function paginaDoAdm(
  browser: Browser,
  opcoes: BrowserContextOptions = {},
) {
  const contexto = await browser.newContext({
    ...opcoes,
    storageState: SESSAO_ADM,
  });
  const page = await contexto.newPage();
  await page.goto('/pt-BR/app');
  await expect(page).toHaveURL(/\/app$/);
  return page;
}

/** Preenche o cadastro (a página já deve estar aberta) e devolve o e-mail usado. */
export async function preencherCadastro(
  page: Page,
  nome: string,
  prefixo = 'cliente',
) {
  const email = emailUnico(prefixo);
  await campo(page, 'Nome').fill(nome);
  await campo(page, 'E-mail').fill(email);
  await campo(page, 'Senha').fill('senha-de-teste-1');
  await page.getByRole('button', { name: 'Criar conta' }).click();
  return email;
}

export async function cadastrar(page: Page, nome: string, prefixo = 'cliente') {
  await page.goto('/pt-BR/app/cadastro');
  const email = await preencherCadastro(page, nome, prefixo);
  await expect(page).toHaveURL(/\/app$/);
  return email;
}

/** Token do link mais recente enviado para a pessoa (caixa de e-mails de desenvolvimento). */
export async function tokenDoUltimoEmail(
  request: APIRequestContext,
  para: string,
) {
  const res = await request.get(`${API_URL}/dev/emails`, { params: { para } });
  const [ultimo] = (await res.json()) as Array<{ texto: string }>;
  const token = /token=([\w-]+)/.exec(ultimo?.texto ?? '')?.[1];
  expect(token, `nenhum link com token enviado para ${para}`).toBeTruthy();
  return token!;
}

/** Roda a verificação de pendências (doses atrasadas, retornos e resumos por e-mail). */
export async function verificarPendencias(request: APIRequestContext) {
  const res = await request.post(`${API_URL}/tarefas/verificar-pendencias`, {
    headers: { 'x-tarefa-token': TOKEN_TAREFAS },
  });
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as {
    dosesAtrasadas: number;
    retornos: number;
    partes: number;
    emails: number;
  };
}

/**
 * Roda SQL direto no banco descartável do e2e (container do `npm run e2e`).
 * Só para preparar o que a interface não permite, como datas no passado.
 */
export function sql(comando: string) {
  return execFileSync(
    'docker',
    [
      'exec',
      'amicats-db-e2e',
      'psql',
      '-U',
      'amicats',
      '-d',
      'amicats',
      '-v',
      'ON_ERROR_STOP=1',
      '-tAc',
      comando,
    ],
    { encoding: 'utf8' },
  ).trim();
}

/** Dia (AAAA-MM-DD) no horário do abrigo, deslocado em dias. */
export function diaNoAbrigo(deslocamentoDias = 0) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO_ABRIGO }).format(
    new Date(Date.now() + deslocamentoDias * 864e5),
  );
}

/** "AAAA-MM-DDTHH:MM" (para <input type="datetime-local">) de um instante, no horário do abrigo. */
export function dataHoraNoAbrigo(instante: Date) {
  const hora = new Intl.DateTimeFormat('en-GB', {
    timeZone: FUSO_ABRIGO,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instante);
  const dia = new Intl.DateTimeFormat('en-CA', {
    timeZone: FUSO_ABRIGO,
  }).format(instante);
  return `${dia}T${hora}`;
}

export function horaNoAbrigo() {
  return Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: FUSO_ABRIGO,
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(new Date()),
  );
}

/** Botão do sininho (o rótulo inclui a quantidade de não lidas). */
export const sininho = (page: Page) =>
  page.locator('summary[aria-label^="Notificações"]');

/** Abre o sininho e clica na notificação com o título informado. */
export async function abrirNotificacao(page: Page, titulo: RegExp) {
  await sininho(page).click();
  await page.getByRole('button', { name: titulo }).first().click();
}

/** Algumas páginas destacam o carrossel: escolhe um botão dentro da área visível da tela. */
export async function botaoVisivelNaTela(page: Page, nome: string) {
  const botoes = page.getByRole('button', { name: nome });
  await botoes.first().waitFor({ state: 'attached' });
  const largura = page.viewportSize()?.width ?? 1280;
  for (let i = 0; i < (await botoes.count()); i++) {
    const caixa = await botoes.nth(i).boundingBox();
    if (caixa && caixa.x > 0 && caixa.x + caixa.width < largura)
      return botoes.nth(i);
  }
  throw new Error(`nenhum botão "${nome}" dentro da tela`);
}
