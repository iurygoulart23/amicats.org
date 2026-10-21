import { useLingui } from '@lingui/react/macro';
import type {
  Cargo,
  CategoriaGasto,
  PrecisaoNascimento,
  Sexo,
  StatusGato,
  TipoEventoVet,
  TipoTag,
  Via,
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

  const categoriaGasto: Record<CategoriaGasto, string> = {
    racao: t`Ração`,
    medicamento: t`Medicamento`,
    veterinario: t`Veterinário`,
    exame: t`Exame`,
    higiene: t`Higiene e areia`,
    outro: t`Outro`,
  };

  const via: Record<Via, string> = {
    oral: t`Oral`,
    topica: t`Tópica (na pele)`,
    injetavel: t`Injetável`,
    ocular: t`Colírio (olhos)`,
    otologica: t`Nos ouvidos`,
    outra: t`Outra`,
  };
  const tipoEventoVet: Record<TipoEventoVet, string> = {
    consulta: t`Consulta`,
    vacina: t`Vacina`,
    vermifugo: t`Vermífugo`,
    exame: t`Exame`,
    cirurgia: t`Cirurgia`,
    castracao: t`Castração`,
    outro: t`Outro`,
  };

  return {
    cargo,
    status,
    sexo,
    precisao,
    tipoTag,
    categoriaGasto,
    via,
    tipoEventoVet,
  };
}
