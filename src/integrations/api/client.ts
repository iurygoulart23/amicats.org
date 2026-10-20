export const API_URL = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:3333'
).replace(/\/$/, '');

export type ErroDeCampo = { campo: string; mensagem: string };

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly erros: Array<ErroDeCampo> = [],
  ) {
    super(message);
  }

  /** Mensagem do primeiro erro de um campo do formulário, se houver. */
  erroDoCampo(campo: string) {
    return this.erros.find((e) => e.campo === campo)?.mensagem;
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

type ApiOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Query;
  fetchImpl?: typeof fetch;
};

export function montarUrl(path: string, query?: Query) {
  const url = new URL(`${API_URL}${path}`);
  Object.entries(query ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, String(v));
    }
  });
  return url.toString();
}

/** Chamada à amicats-api com o cookie de sessão; lança ApiError em respostas não-2xx. */
export async function api<T>(
  path: string,
  { method = 'GET', body, query, fetchImpl = fetch }: ApiOptions = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetchImpl(montarUrl(path, query), {
      method,
      credentials: 'include',
      headers: body !== undefined ? { 'content-type': 'application/json' } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao servidor.');
  }

  if (res.status === 204) return undefined as T;
  const dados = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      dados?.mensagem ?? 'Algo deu errado. Tente novamente.',
      dados?.erros ?? [],
    );
  }
  return dados as T;
}
