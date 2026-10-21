import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLingui } from '@lingui/react/macro';
import { HeartHandshake, Trash2 } from 'lucide-react';
import type { CategoriaGasto, UsuarioLogado } from '@/integrations/api/types';
import { AlertaErro } from '@/components/app/alerta-erro';
import { Campo } from '@/components/app/campo';
import { formatarData } from '@/components/app/gato-saude';
import {
  formatarMes,
  formatarReais,
  mesAtual,
  reaisParaCentavos,
} from '@/components/app/shared/formatos';
import { useRotulos } from '@/hooks/use-rotulos';
import { padrinhosQuery } from '@/integrations/api/apadrinhamentos.queries';
import { podeAcessar } from '@/integrations/api/cargos';
import {
  gastosQuery,
  useExcluirGasto,
  useLancarGasto,
} from '@/integrations/api/gastos.queries';

export interface GatoGastosProps {
  gatoId: string;
  me: UsuarioLogado;
}

export function GatoGastos({ gatoId, me }: GatoGastosProps) {
  const { t, i18n } = useLingui();
  const rotulos = useRotulos();
  const [mes, setMes] = useState(mesAtual());
  const gastos = useQuery(gastosQuery(gatoId, mes));
  const padrinhos = useQuery(padrinhosQuery(gatoId));
  const lancar = useLancarGasto(gatoId);
  const excluir = useExcluirGasto(gatoId);
  const ehAdm = podeAcessar(me.cargo, 'adm');
  const nPadrinhos = padrinhos.data?.length ?? 0;

  const enviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const data = String(form.get('data'));
    lancar.mutate(
      {
        categoria: form.get('categoria') as CategoriaGasto,
        descricao: String(form.get('descricao')),
        valorCentavos: reaisParaCentavos(String(form.get('valor'))),
        data,
      },
      {
        onSuccess: () => {
          formEl.reset();
          setMes(data.slice(0, 7));
        },
      },
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <Campo label={t`Mês`}>
            <input
              type="month"
              value={mes}
              max={mesAtual()}
              onChange={(e) => e.target.value && setMes(e.target.value)}
              className="input w-44"
            />
          </Campo>
          <div className="stats bg-base-200">
            <div className="stat py-2">
              <div className="stat-title">{t`Total do mês`}</div>
              <div className="stat-value text-xl">
                {formatarReais(gastos.data?.totalCentavos ?? 0, i18n.locale)}
              </div>
            </div>
            <div className="stat py-2">
              <div className="stat-title">{t`Padrinhos ativos`}</div>
              <div className="stat-value text-xl">{nPadrinhos}</div>
            </div>
          </div>
        </div>

        {nPadrinhos > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <HeartHandshake className="size-4 text-primary" />
            {padrinhos.data?.map((p) => (
              <span
                key={p.apadrinhamentoId}
                className="badge badge-outline"
                title={p.email}
              >
                {p.nome}
              </span>
            ))}
          </div>
        )}

        <AlertaErro erro={gastos.error ?? excluir.error} />
        <div className="overflow-x-auto bg-base-100 rounded-box">
          <table className="table">
            <thead>
              <tr>
                <th>{t`Data`}</th>
                <th>{t`Descrição`}</th>
                <th className="hidden md:table-cell">{t`Categoria`}</th>
                <th className="text-right">{t`Valor`}</th>
                {ehAdm && <th />}
              </tr>
            </thead>
            <tbody>
              {gastos.data?.itens.length === 0 && (
                <tr>
                  <td colSpan={5} className="opacity-70">
                    {t`Nenhum gasto em`} {formatarMes(mes, i18n.locale)}.
                  </td>
                </tr>
              )}
              {gastos.data?.itens.map((g) => (
                <tr key={g.id}>
                  <td>{formatarData(g.data)}</td>
                  <td>
                    {g.descricao}
                    {g.registradoPor && (
                      <span className="block text-xs opacity-60">
                        {g.registradoPor.nome}
                      </span>
                    )}
                  </td>
                  <td className="hidden md:table-cell">
                    {rotulos.categoriaGasto[g.categoria]}
                  </td>
                  <td className="text-right whitespace-nowrap">
                    {formatarReais(g.valorCentavos, i18n.locale)}
                  </td>
                  {ehAdm && (
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs text-error"
                        aria-label={t`Excluir gasto`}
                        onClick={() => {
                          if (confirm(t`Excluir este gasto?`))
                            excluir.mutate(g.id);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!ehAdm && (
          <p className="text-xs opacity-60">
            {t`Lançou algo errado? Peça para a administração corrigir.`}
          </p>
        )}
      </section>

      <form onSubmit={enviar} className="card bg-base-100 shadow-sm h-fit">
        <div className="card-body p-4 gap-1">
          <h3 className="card-title text-base">{t`Lançar gasto`}</h3>
          <AlertaErro erro={lancar.error} />
          <Campo label={t`Descrição`}>
            <input
              name="descricao"
              required
              maxLength={200}
              className="input w-full"
            />
          </Campo>
          <Campo label={t`Categoria`}>
            <select
              name="categoria"
              defaultValue="racao"
              className="select w-full"
            >
              {Object.entries(rotulos.categoriaGasto).map(([valor, label]) => (
                <option key={valor} value={valor}>
                  {label}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label={t`Valor (R$)`}>
            <input
              name="valor"
              required
              inputMode="decimal"
              pattern="[0-9.,]+"
              placeholder="89,90"
              className="input w-full"
            />
          </Campo>
          <Campo label={t`Data`}>
            <input
              name="data"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="input w-full"
            />
          </Campo>
          <div className="card-actions justify-end mt-2">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={lancar.isPending}
            >
              {t`Lançar`}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
