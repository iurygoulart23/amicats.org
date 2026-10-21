import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { HttpError } from './errors.js';

export type UrlUpload = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
};

export interface Storage {
  criarUrlUpload: (key: string, contentType: string) => Promise<UrlUpload>;
  urlPublica: (key: string) => string;
  remover: (key: string) => Promise<void>;
}

export type S3StorageConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string;
};

const UPLOAD_EXPIRA_SEGUNDOS = 10 * 60;

export function createS3Storage(config: S3StorageConfig): Storage {
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  const publicBase = config.publicUrl.replace(/\/$/, '');
  const urlPublica = (key: string) => `${publicBase}/${key}`;

  return {
    urlPublica,
    async criarUrlUpload(key, contentType) {
      const uploadUrl = await getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          ContentType: contentType,
        }),
        { expiresIn: UPLOAD_EXPIRA_SEGUNDOS },
      );
      return { uploadUrl, publicUrl: urlPublica(key), key };
    },
    async remover(key) {
      await client.send(
        new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
      );
    },
  };
}

/** Sem credenciais configuradas: qualquer tentativa de upload falha com mensagem clara. */
export function createDisabledStorage(): Storage {
  const indisponivel = () =>
    new HttpError(503, 'Upload de fotos não configurado (S3_*).');
  const erro = () => Promise.reject(indisponivel());
  return {
    criarUrlUpload: erro,
    remover: erro,
    urlPublica: () => {
      throw indisponivel();
    },
  };
}
