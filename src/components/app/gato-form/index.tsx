import { useLingui } from '@lingui/react/macro';
import type {
  Gato,
  GatoInput,
  PrecisaoNascimento,
  Sexo,
  StatusGato,
} from '@/integrations/api/types';
import { AlertaErro } from '@/components/app/alerta-erro';
import { Campo } from '@/components/app/campo';
import { useRotulos } from '@/hooks/use-rotulos';
import { ApiError } from '@/integrations/api/client';

export interface GatoFormProps {
  gato?: Gato;
  salvando: boolean;
  erro: unknown;
  onSalvar: (dados: GatoInput) => void;
}

const vazioComoNull = (v: FormDataEntryValue | null) => {
  const texto = String(v ?? '').trim();
  return texto ? texto : null;
};

export function GatoForm({ gato, salvando, erro, onSalvar }: GatoFormProps) {
  const { t } = useLingui();
  const rotulos = useRotulos();
  const apiErro = erro instanceof ApiError ? erro : null;

  const enviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    onSalvar({
      nome: String(form.get('nome')).trim(),
      dataNascimentoAprox: vazioComoNull(form.get('dataNascimentoAprox')),
      precisaoNascimento: form.get('precisaoNascimento') as PrecisaoNascimento,
      sexo: form.get('sexo') as Sexo,
      status: form.get('status') as StatusGato,
      castrado: form.get('castrado') === 'on',
      publicado: form.get('publicado') === 'on',
      descricaoPt: String(form.get('descricaoPt') ?? ''),
      descricaoEn: vazioComoNull(form.get('descricaoEn')),
      observacoes: String(form.get('observacoes') ?? ''),
    });
  };

  return (
    <form onSubmit={enviar} className="flex flex-col gap-2">
      <AlertaErro erro={apiErro} />
      {!apiErro && <AlertaErro erro={erro} />}

      <div className="grid gap-x-4 md:grid-cols-2">
        <Campo label={t`Nome`} erro={apiErro?.erroDoCampo('nome')}>
          <input
            name="nome"
            required
            defaultValue={gato?.nome}
            className="input w-full"
          />
        </Campo>
        <Campo label={t`Status`}>
          <select
            name="status"
            defaultValue={gato?.status ?? 'disponivel'}
            className="select w-full"
          >
            {Object.entries(rotulos.status).map(([valor, label]) => (
              <option key={valor} value={valor}>
                {label}
              </option>
            ))}
          </select>
        </Campo>
        <Campo
          label={t`Nascimento aproximado`}
          erro={apiErro?.erroDoCampo('dataNascimentoAprox')}
          dica={t`Se não souber o dia, use o dia 1º do mês ou do ano estimado.`}
        >
          <input
            name="dataNascimentoAprox"
            type="date"
            defaultValue={gato?.dataNascimentoAprox ?? ''}
            className="input w-full"
          />
        </Campo>
        <Campo label={t`Precisão da data`}>
          <select
            name="precisaoNascimento"
            defaultValue={gato?.precisaoNascimento ?? 'ano'}
            className="select w-full"
          >
            {Object.entries(rotulos.precisao).map(([valor, label]) => (
              <option key={valor} value={valor}>
                {label}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label={t`Sexo`}>
          <select
            name="sexo"
            defaultValue={gato?.sexo ?? 'desconhecido'}
            className="select w-full"
          >
            {Object.entries(rotulos.sexo).map(([valor, label]) => (
              <option key={valor} value={valor}>
                {label}
              </option>
            ))}
          </select>
        </Campo>
        <div className="flex flex-col justify-end gap-2 py-2">
          <label className="label cursor-pointer gap-2">
            <input
              name="castrado"
              type="checkbox"
              defaultChecked={gato?.castrado}
              className="checkbox"
            />
            {t`Castrado`}
          </label>
          <label className="label cursor-pointer gap-2">
            <input
              name="publicado"
              type="checkbox"
              defaultChecked={gato?.publicado}
              className="toggle toggle-primary"
            />
            {t`Publicado no site`}
          </label>
        </div>
      </div>

      <Campo label={t`Descrição para o site (português)`}>
        <textarea
          name="descricaoPt"
          defaultValue={gato?.descricaoPt}
          rows={3}
          className="textarea w-full"
        />
      </Campo>
      <Campo
        label={t`Descrição para o site (inglês)`}
        dica={t`Opcional. Sem ela, o site em inglês mostra a descrição em português.`}
      >
        <textarea
          name="descricaoEn"
          defaultValue={gato?.descricaoEn ?? ''}
          rows={3}
          className="textarea w-full"
        />
      </Campo>
      <Campo
        label={t`Observações internas`}
        dica={t`Só voluntários e administração veem. Nunca aparece no site.`}
      >
        <textarea
          name="observacoes"
          defaultValue={gato?.observacoes}
          rows={4}
          className="textarea w-full"
        />
      </Campo>

      <div className="flex justify-end">
        <button type="submit" className="btn btn-primary" disabled={salvando}>
          {salvando && <span className="loading loading-spinner" />}
          {t`Salvar`}
        </button>
      </div>
    </form>
  );
}
