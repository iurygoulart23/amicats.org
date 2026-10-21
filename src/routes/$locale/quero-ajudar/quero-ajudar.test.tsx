import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, test } from 'vitest';
import { i18n } from '@lingui/core';
import RouteComponent from './index';

describe('Route: /quero-ajudar/ — basic UI contract', () => {
  beforeEach(() => {
    // make locale deterministic for resolveLocale used by the route
    window.history.pushState({}, '', '/pt-BR/quero-ajudar/');
    try {
      document.cookie = 'locale=pt-BR';
    } catch {}
    try {
      i18n.activate('pt-BR');
    } catch {}
  });

  afterEach(() => {
    try {
      document.cookie =
        'locale=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
    } catch {}
  });

  test('renders hero and rich help cards (donation, items, volunteering) with expected CTAs and links', () => {
    // Arrange
    render(<RouteComponent />);

    // Act — scope to the main content to avoid header/footer collisions
    const content = document.getElementById('quero-ajudar-content');
    expect(content).toBeTruthy();

    // Assert — Hero heading
    const heading = screen.getByRole('heading', {
      name: /Como Ajudar|How to help/i,
    });
    expect(heading).toBeInTheDocument();

    // DonationCard: one-time and recurring sections
    const doacaoUnica = within(content as HTMLElement).getByRole('heading', {
      name: /Doação Única/i,
    });
    expect(doacaoUnica).toBeInTheDocument();

    const doacaoRecorrente = within(content as HTMLElement).getByRole(
      'heading',
      {
        name: /Doação Recorrente/i,
      },
    );
    expect(doacaoRecorrente).toBeInTheDocument();

    // Doação online (pix, cartão ou boleto pelo Mercado Pago)
    const doarOnline = within(content as HTMLElement).getByRole('link', {
      name: /Doar online/i,
    });
    expect(doarOnline).toBeInTheDocument();
    expect(
      doarOnline.getAttribute('href') || doarOnline.getAttribute('to') || '',
    ).toMatch(/\/doar/);

    // DonationCard: link to apadrinhamento (bottom ghost button)
    const saibaApadrinhar = within(content as HTMLElement).getByRole('link', {
      name: /Saiba como apadrinhar/i,
    });
    expect(saibaApadrinhar).toBeInTheDocument();
    expect(
      saibaApadrinhar.getAttribute('to') ||
        saibaApadrinhar.getAttribute('href') ||
        '',
    ).toContain('/como-funciona/?section=apadrinhamento');

    // ItemsDonationCard: heading and WhatsApp CTA
    const itensHeading = within(content as HTMLElement).getByRole('heading', {
      name: /Doação de Itens/i,
    });
    expect(itensHeading).toBeInTheDocument();

    const doarItens = within(content as HTMLElement).getByRole('link', {
      name: /Quero doar itens/i,
    });
    expect(doarItens).toBeInTheDocument();
    expect(
      (doarItens.getAttribute('href') || '').startsWith(
        'https://api.whatsapp.com/',
      ),
    ).toBeTruthy();

    // VoluntarieCard: heading and CTAs
    const voluntarieHeading = within(content as HTMLElement).getByRole(
      'heading',
      {
        name: /Doe Seu Tempo/i,
      },
    );
    expect(voluntarieHeading).toBeInTheDocument();

    const entrarContato = within(content as HTMLElement).getByRole('link', {
      name: /Entrar em contato/i,
    });
    expect(entrarContato).toBeInTheDocument();
    expect(
      (entrarContato.getAttribute('href') || '').startsWith(
        'https://api.whatsapp.com/',
      ),
    ).toBeTruthy();

    const saibaVoluntariado = within(content as HTMLElement).getByRole('link', {
      name: /Saiba como funciona/i,
    });
    expect(saibaVoluntariado).toBeInTheDocument();
    expect(
      saibaVoluntariado.getAttribute('to') ||
        saibaVoluntariado.getAttribute('href') ||
        '',
    ).toContain('/como-funciona/?section=voluntariado');
  });
});

export {};
