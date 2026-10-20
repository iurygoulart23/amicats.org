import { useRef } from 'react';
import { useLingui } from '@lingui/react/macro';
import { Star, Trash2, Upload } from 'lucide-react';
import type { Gato } from '@/integrations/api/types';
import { AlertaErro } from '@/components/app/alerta-erro';
import {
  useDefinirCapa,
  useEnviarFoto,
  useExcluirFoto,
} from '@/integrations/api/gatos.queries';

export interface GatoFotosProps {
  gato: Gato;
}

const TIPOS_ACEITOS = 'image/jpeg,image/png,image/webp,image/heic';

export function GatoFotos({ gato }: GatoFotosProps) {
  const { t } = useLingui();
  const input = useRef<HTMLInputElement>(null);
  const enviar = useEnviarFoto(gato.id);
  const capa = useDefinirCapa(gato.id);
  const excluir = useExcluirFoto(gato.id);

  const aoEscolher = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivos = Array.from(e.target.files ?? []);
    for (const arquivo of arquivos) {
      await enviar.mutateAsync(arquivo).catch(() => {});
    }
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-4">
      <AlertaErro erro={enviar.error ?? capa.error ?? excluir.error} />
      <div>
        <input
          ref={input}
          type="file"
          accept={TIPOS_ACEITOS}
          multiple
          className="hidden"
          onChange={(e) => void aoEscolher(e)}
        />
        <button
          type="button"
          className="btn btn-primary btn-soft"
          onClick={() => input.current?.click()}
          disabled={enviar.isPending}
        >
          {enviar.isPending ? (
            <span className="loading loading-spinner" />
          ) : (
            <Upload className="size-4" />
          )}
          {t`Enviar fotos`}
        </button>
      </div>

      {gato.fotos.length === 0 ? (
        <p className="opacity-70">{t`Nenhuma foto ainda.`}</p>
      ) : (
        <ul className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {gato.fotos.map((foto) => (
            <li
              key={foto.id}
              className="card bg-base-100 shadow-sm overflow-hidden"
            >
              <figure className="aspect-square">
                <img
                  src={foto.url}
                  alt={gato.nome}
                  className="w-full h-full object-cover"
                />
              </figure>
              <div className="flex items-center justify-between p-2">
                {foto.capa ? (
                  <span className="badge badge-primary badge-sm">{t`Capa`}</span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs"
                    onClick={() => capa.mutate(foto.id)}
                    title={t`Usar como capa`}
                  >
                    <Star className="size-4" />
                    {t`Capa`}
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-ghost btn-xs text-error"
                  aria-label={t`Excluir foto`}
                  onClick={() => {
                    if (confirm(t`Excluir esta foto?`)) excluir.mutate(foto.id);
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
