/** R$ a partir de centavos, no formato do idioma do site. */
export function formatarReais(centavos: number, locale = 'pt-BR'): string {
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(centavos / 100);
}

/** "R$ 12,34" digitado → 1234 centavos; aceita vírgula ou ponto como decimal. */
export function reaisParaCentavos(texto: string): number {
  const limpo = texto.replace(/[^\d,.]/g, '');
  const normalizado = limpo.includes(',')
    ? limpo.replace(/\./g, '').replace(',', '.')
    : limpo;
  return Math.round(Number(normalizado) * 100);
}

/** "2026-09" → "setembro de 2026" / "September 2026". */
export function formatarMes(mes: string, locale = 'pt-BR'): string {
  const [ano, m] = mes.split('-').map(Number);
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(ano, m - 1, 1)));
}

export function mesAtual(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Campo Grande/MS: UTC-4 o ano todo. */
export const FUSO_ABRIGO = 'America/Campo_Grande';
const OFFSET_ABRIGO = '-04:00';

/** "08:00" de um instante ISO, no horário do abrigo. */
export function formatarHoraAbrigo(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: FUSO_ABRIGO,
  }).format(new Date(iso));
}

/** "20/10/2026 08:00" de um instante ISO, no horário do abrigo. */
export function formatarDataHoraAbrigo(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: FUSO_ABRIGO,
  }).format(new Date(iso));
}

/** Valor de <input type="datetime-local"> (horário do abrigo) → ISO com fuso. */
export function datetimeLocalParaIso(valor: string): string {
  return `${valor}:00${OFFSET_ABRIGO}`;
}

/** Hoje (AAAA-MM-DD) no horário do abrigo. */
export function hojeNoAbrigo(agora = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO_ABRIGO }).format(
    agora,
  );
}

/** "21/11/2026" de um instante ISO, no dia do abrigo (evita trocar o dia perto da meia-noite UTC). */
export function formatarDataAbrigo(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeZone: FUSO_ABRIGO,
  }).format(new Date(iso));
}
