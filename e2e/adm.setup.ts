import { test as setup } from '@playwright/test';
import { SESSAO_ADM, entrarComoAdm } from './apoio';

// Um login só para todos os roteiros: a API limita 5 tentativas por minuto por e-mail.
setup('sessão do adm', async ({ page }) => {
  await entrarComoAdm(page);
  await page.context().storageState({ path: SESSAO_ADM });
});
