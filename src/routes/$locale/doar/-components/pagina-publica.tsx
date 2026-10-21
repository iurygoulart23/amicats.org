import type { ReactNode } from 'react';
import { Container } from '@/components/layout/ui/container';
import { Footer } from '@/components/pages/landing/footer';
import { Navbar as LandingNavbar } from '@/components/pages/landing/navbar';

export interface PaginaPublicaProps {
  id: string;
  titulo: string;
  subtitulo: string;
  children: ReactNode;
}

/** Moldura das páginas de doação: navbar do site, faixa de título e rodapé. */
export function PaginaPublica({
  id,
  titulo,
  subtitulo,
  children,
}: PaginaPublicaProps) {
  return (
    <div className="pt-16 md:pt-20">
      <Container id={`${id}-navbar`} spacing="lg" fluid>
        <LandingNavbar forceVisible />
      </Container>
      <div className="w-full bg-primary text-primary-content mb-6">
        <div className="mx-auto w-full md:w-4/5 p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight text-white">
            {titulo}
          </h1>
          <p className="mt-2 text-base opacity-95 text-white">{subtitulo}</p>
        </div>
      </div>
      <Container id={`${id}-content`} spacing="lg" className="pb-10" fluid>
        <div className="mx-auto max-w-xl">{children}</div>
      </Container>
      <Footer />
    </div>
  );
}
