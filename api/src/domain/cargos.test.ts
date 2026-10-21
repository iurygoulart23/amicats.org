import { describe, expect, it } from 'vitest';
import { podeAcessar } from './cargos.js';

describe('podeAcessar', () => {
  it('adm acessa tudo', () => {
    expect(podeAcessar('adm', 'adm')).toBe(true);
    expect(podeAcessar('adm', 'voluntario')).toBe(true);
    expect(podeAcessar('adm', 'cliente')).toBe(true);
  });

  it('voluntário acessa áreas de voluntário e de cliente, mas não de adm', () => {
    expect(podeAcessar('voluntario', 'adm')).toBe(false);
    expect(podeAcessar('voluntario', 'voluntario')).toBe(true);
    expect(podeAcessar('voluntario', 'cliente')).toBe(true);
  });

  it('cliente acessa apenas áreas de cliente', () => {
    expect(podeAcessar('cliente', 'adm')).toBe(false);
    expect(podeAcessar('cliente', 'voluntario')).toBe(false);
    expect(podeAcessar('cliente', 'cliente')).toBe(true);
  });
});
