import { useLingui } from '@lingui/react/macro';
import type {
  Cargo,
  PrecisaoNascimento,
  Sexo,
  StatusGato,
  TipoTag,
} from '@/integrations/api/types';

/** Rótulos traduzidos dos valores fixos do domínio. */
export function useRotulos() {
  const { t } = useLingui();

  const cargo: Record<Cargo, string> = {
    adm: t`Administração`,
    voluntario: t`Voluntário`,
    cliente: t`Cliente`,
  };
  const status: Record<StatusGato, string> = {
    disponivel: t`Disponível`,
    apadrinhado: t`Apadrinhado`,
    adotado: t`Adotado`,
    em_tratamento: t`Em tratamento`,
    falecido: t`Falecido`,
  };
  const sexo: Record<Sexo, string> = {
    macho: t`Macho`,
    femea: t`Fêmea`,
    desconhecido: t`Não informado`,
  };
  const precisao: Record<PrecisaoNascimento, string> = {
    dia: t`Data exata`,
    mes: t`Mês aproximado`,
    ano: t`Só o ano`,
  };
  const tipoTag: Record<TipoTag, string> = {
    doenca: t`Doença`,
    comportamento: t`Comportamento`,
    cuidado: t`Cuidado`,
  };

  return { cargo, status, sexo, precisao, tipoTag };
}
