import { z } from 'zod';
import { CARGOS } from '../../domain/cargos.js';

export const Email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('E-mail inválido.'));

export const Senha = z
  .string()
  .min(8, 'A senha precisa ter pelo menos 8 caracteres.')
  .max(200);

export const UsuarioPublico = z.object({
  id: z.string(),
  nome: z.string(),
  email: z.string(),
  cargo: z.enum(CARGOS),
  telefone: z.string().nullable(),
  notificarPorEmail: z.boolean(),
});
