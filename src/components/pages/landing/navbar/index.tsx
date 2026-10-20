import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { Trans, useLingui } from '@lingui/react/macro';
import { cn } from '@/components/layout/shared/helpers/class.helper';
import amicatsLogoFull from '@/assets/amicats-logo-full.png';
import { LanguageSelect } from '@/components/layout/ui/language-select';
import { resolveLocale } from '@/integrations/lingui/resolve-locale';

export function Navbar({
  forceVisible,
}: {
  forceVisible?: boolean;
}): JSX.Element | null {
  const navRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState<boolean>(!!forceVisible);
  const { t } = useLingui();
  // derive locale-aware landing path so navbar links from localized pages
  // resolve to the actual localized landing route (e.g. /pt-BR/)
  const params = useParams({ strict: false });
  const locale = resolveLocale({ params }).locale;
  const landingTo = `/${locale}/`;
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (forceVisible) {
      // when forced visible, keep visible true and skip scroll listener
      setVisible(true);
      return () => {};
    }

    const onScroll = () => {
      const show = window.scrollY >= 24;
      setVisible(show);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (typeof document !== 'undefined')
        document.documentElement.style.scrollPaddingTop = '';
    };
  }, []);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (visible) {
      timeoutId = setTimeout(() => {
        const el = navRef.current;
        if (el && typeof document !== 'undefined') {
          const h = el.getBoundingClientRect().height;
          document.documentElement.style.scrollPaddingTop = `${Math.ceil(h)}px`;
        }
      }, 0);
    } else {
      if (typeof document !== 'undefined')
        document.documentElement.style.scrollPaddingTop = '';
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (typeof document !== 'undefined')
        document.documentElement.style.scrollPaddingTop = '';
    };
  }, [visible]);

  return (
    <div
      ref={navRef}
      className={cn(
        'fixed top-0 left-0 right-0 transition-all duration-200',
        // keep z-50 so nav remains above normal content, but avoid
        // interfering with the language menu which is portalled to body.
        visible
          ? 'z-50 translate-y-0 opacity-100'
          : 'z-40 -translate-y-full opacity-0',
      )}
      aria-hidden={!visible}
    >
      <nav
        className="navbar bg-base-100 shadow-sm py-2"
        role="navigation"
        aria-label={t`Navegação principal`}
      >
        <div className="relative w-full flex items-center">
          <div className="flex-none pl-4">
            <Link
              to={landingTo}
              hash="introducao"
              className="inline-flex items-center justify-center rounded-full p-1 hover:bg-base-200 focus:outline-none"
              aria-label={t`Home`}
            >
              <div className="p-2 h-18 w-18 rounded-full bg-base-100">
                <img
                  src={amicatsLogoFull}
                  alt="Amicats"
                  className="h-16 w-16 object-contain pb-2"
                />
              </div>
            </Link>
          </div>

          {/* Use DaisyUI navbar regions to avoid absolute positioning.
              Show full horizontal menu only at lg and above to avoid cramped layouts. */}
          <div className="navbar-center hidden lg:flex">
            <ul className="menu menu-horizontal px-1">
              <li>
                <Link to={landingTo} hash="adote">
                  <Trans>Adote</Trans>
                </Link>
              </li>
              <li>
                <Link to={landingTo} hash="quem-somos">
                  <Trans>Quem Somos</Trans>
                </Link>
              </li>
              <li>
                <Link to={landingTo} hash="o-abrigo">
                  <Trans>O Abrigo</Trans>
                </Link>
              </li>
              <li>
                <Link to={landingTo} hash="voluntarios-section">
                  <Trans>Voluntários</Trans>
                </Link>
              </li>
            </ul>
          </div>

          <div className="navbar-end flex-1 flex justify-end items-center gap-3 pr-4">
            <Link
              to="/$locale/app"
              params={{ locale }}
              className="hidden lg:inline-flex btn btn-ghost btn-md"
            >
              <Trans>Entrar</Trans>
            </Link>

            {/* CTA shown on md+ inline in nav; on mobile it's inside the dropdown */}
            <Link
              to={`/${locale}/quero-ajudar/`}
              className="hidden lg:inline-flex btn btn-primary btn-md"
            >
              <Trans>Quero Ajudar</Trans>
            </Link>

            <LanguageSelect />

            {/* Mobile menu: visible only below lg. Render menu content only when open to avoid
                duplicate text nodes in the DOM while closed. */}
            <div className="lg:hidden">
              <div className="dropdown dropdown-end">
                <button
                  type="button"
                  aria-controls="landing-mobile-menu"
                  aria-expanded={mobileOpen}
                  aria-label={t`Abrir menu`}
                  onClick={() => setMobileOpen((s) => !s)}
                  className="btn btn-ghost btn-square"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>

                {mobileOpen && (
                  <ul
                    id="landing-mobile-menu"
                    role="menu"
                    className={cn(
                      'menu menu-compact dropdown-content mt-2 p-2 shadow bg-base-100 rounded-box w-52 space-y-2',
                    )}
                  >
                    <li>
                      <Link
                        to={landingTo}
                        hash="adote"
                        onClick={() => setMobileOpen(false)}
                      >
                        <Trans>Adote</Trans>
                      </Link>
                    </li>
                    <li>
                      <Link
                        to={landingTo}
                        hash="quem-somos"
                        onClick={() => setMobileOpen(false)}
                      >
                        <Trans>Quem Somos</Trans>
                      </Link>
                    </li>
                    <li>
                      <Link
                        to={landingTo}
                        hash="o-abrigo"
                        onClick={() => setMobileOpen(false)}
                      >
                        <Trans>O Abrigo</Trans>
                      </Link>
                    </li>
                    <li>
                      <Link
                        to={landingTo}
                        hash="voluntarios-section"
                        onClick={() => setMobileOpen(false)}
                      >
                        <Trans>Voluntários</Trans>
                      </Link>
                    </li>
                    <li>
                      <Link
                        to="/$locale/app"
                        params={{ locale }}
                        onClick={() => setMobileOpen(false)}
                      >
                        <Trans>Entrar</Trans>
                      </Link>
                    </li>
                    <li className={cn('border-t border-base-200 pt-2')}>
                      <Link
                        to={`/${locale}/quero-ajudar/`}
                        className="btn btn-primary w-full"
                        onClick={() => setMobileOpen(false)}
                      >
                        <Trans>Quero Ajudar</Trans>
                      </Link>
                    </li>
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>
    </div>
  );
}
