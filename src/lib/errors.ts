export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
  }
}

export const naoAutenticado = () =>
  new HttpError(401, 'Faça login para continuar.');
export const semPermissao = () =>
  new HttpError(403, 'Você não tem permissão para isso.');
export const naoEncontrado = (o: string) =>
  new HttpError(404, `${o} não encontrado.`);
export const conflito = (msg: string) => new HttpError(409, msg);
