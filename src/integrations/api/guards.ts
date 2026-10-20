import { redirect } from '@tanstack/react-router';
import { meQuery } from './auth.queries';
import { podeAcessar } from './cargos';
import type { QueryClient } from '@tanstack/react-query';
import type { Cargo, UsuarioLogado } from './types';

/** beforeLoad da área logada: sem sessão, manda para o login e volta depois. */
export async function exigirLogin(
  queryClient: QueryClient,
  locale: string,
  voltarPara: string,
): Promise<UsuarioLogado> {
  const me = await queryClient.ensureQueryData(meQuery);
  if (!me) {
    throw redirect({
      to: '/$locale/app/login',
      params: { locale },
      search: { redirect: voltarPara },
    });
  }
  return me;
}

/** beforeLoad de rotas restritas: cargo insuficiente volta para o início da área logada. */
export function exigirCargo(me: UsuarioLogado, cargo: Cargo, locale: string) {
  if (!podeAcessar(me.cargo, cargo)) {
    throw redirect({ to: '/$locale/app', params: { locale } });
  }
}

/** Só aceita redirecionar para caminhos internos (evita open redirect). */
export function destinoSeguro(destino: string | undefined, locale: string) {
  return destino && destino.startsWith('/') && !destino.startsWith('//')
    ? destino
    : `/${locale}/app`;
}
