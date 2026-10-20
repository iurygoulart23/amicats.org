import { useQuery } from '@tanstack/react-query';
import { useLingui } from '@lingui/react/macro';
import { Container } from '@/components/layout/ui/container';
import { GatoCard } from '@/components/layout/ui/gato-card';
import { Flex } from '@/components/layout/ui/flex';
import { SectionContainer } from '@/components/layout/ui/container/section';
import { GatosCarouselComponent as GatosCarousel } from '@/components/layout/ui/gatos-carousel';
import amicatsLogo from '@/assets/amicats-logo-full.png';
import { useRotulos } from '@/hooks/use-rotulos';
import { publicGatosQuery } from '@/integrations/api/gatos.queries';

export interface AdoteSectionProps {
  images: Array<string>;
}

export function AdoteSection({ images: _images }: AdoteSectionProps) {
  const { t, i18n } = useLingui();
  const rotulos = useRotulos();
  const catalogo = useQuery(publicGatosQuery);
  const gatos = (catalogo.data?.itens ?? []).map((gato) => ({
    nome: gato.nome,
    descricao:
      i18n.locale === 'pt-BR'
        ? gato.descricaoPt
        : (gato.descricaoEn ?? gato.descricaoPt),
    // Gato ainda sem foto usa a logo como imagem provisória.
    imagem:
      gato.fotos.find((f) => f.capa)?.url ?? gato.fotos[0]?.url ?? amicatsLogo,
    status: rotulos.status[gato.status],
  }));

  const WHATSAPP_PHONE = '5567999300401';
  const buildWhatsappUrl = (nome: string) => {
    const text = t`Quero apadrinhar o ${nome} e saber como funciona.`;
    const encoded = encodeURIComponent(text);
    return `https://api.whatsapp.com/send/?phone=${WHATSAPP_PHONE}&text=${encoded}&type=phone_number&app_absent=0`;
  };

  const ADOPTION_FORM =
    'https://docs.google.com/forms/d/e/1FAIpQLSfa1qdsHuOn6WeFLKrdMUYJrGzKsI6xW--c7XW-DPGQQbV4WA/viewform?pli=1';

  return (
    <SectionContainer
      containerId="c-adote"
      sectionId="adote"
      background="bg-base-200"
    >
      <Container
        fluid
        id="c-adote-gatinhos"
        spacing="lg"
        className="md:h-screen md:overflow-hidden landscape-mobile:h-auto landscape-mobile:overflow-visible"
      >
        <Flex
          direction="col"
          justify="center"
          className="md:h-full py-10 landscape-mobile:h-auto"
        >
          <div className="text-center max-w-2xl mx-auto mb-6">
            <span className="text-primary-content font-bold tracking-widest uppercase text-sm mb-2 block">
              {t`Nossos amiguinhos`}
            </span>
            <h2 className="text-xl md:text-3xl xl:text-4xl landscape-mobile:text-base text-primary font-bold mb-3">
              {t`Gatinhos Disponíveis`}
            </h2>
            <p className="text-sm md:text-base opacity-70">
              {t`Estes pequenos estão prontos para encher sua casa de alegria.`}
            </p>
          </div>

          {catalogo.isPending && (
            <div className="flex justify-center py-10">
              <span className="loading loading-dots loading-lg text-primary" />
            </div>
          )}
          {catalogo.isError && (
            <p role="status" className="text-center opacity-70 py-10">
              {t`Não conseguimos carregar os gatinhos agora. Tente novamente em instantes.`}
            </p>
          )}
          <GatosCarousel buttonShape="circle" buttonColor="primary">
            {gatos.map((gato) => (
              <GatoCard
                key={gato.nome}
                nome={gato.nome}
                descricao={gato.descricao}
                imagem={gato.imagem}
                status={gato.status}
                hrefApadrinhar={buildWhatsappUrl(gato.nome)}
                hrefAdotar={ADOPTION_FORM}
              />
            ))}
          </GatosCarousel>
        </Flex>
      </Container>
    </SectionContainer>
  );
}
