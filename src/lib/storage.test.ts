import { describe, expect, it } from 'vitest';
import { createS3Storage } from './storage.js';

describe('createS3Storage', () => {
  it('gera URL pré-assinada de PUT no bucket e a URL pública do arquivo', async () => {
    const storage = createS3Storage({
      endpoint: 'https://s3.us-east-005.backblazeb2.com',
      region: 'us-east-005',
      bucket: 'catalogo-gatos',
      accessKeyId: 'id-teste',
      secretAccessKey: 'segredo-teste',
      publicUrl: 'https://f005.backblazeb2.com/file/catalogo-gatos/',
    });

    const { uploadUrl, publicUrl } = await storage.criarUrlUpload(
      'gatos/abc/foto.jpg',
      'image/jpeg',
    );

    const url = new URL(uploadUrl);
    expect(url.pathname).toBe('/catalogo-gatos/gatos/abc/foto.jpg');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('600');
    expect(url.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
    expect(publicUrl).toBe(
      'https://f005.backblazeb2.com/file/catalogo-gatos/gatos/abc/foto.jpg',
    );
  });
});
