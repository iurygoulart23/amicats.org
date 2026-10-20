import { Outlet, createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/app/app-shell';
import { exigirLogin } from '@/integrations/api/guards';

export const Route = createFileRoute('/$locale/app/_painel')({
  beforeLoad: async ({ context, params, location }) => {
    const me = await exigirLogin(
      context.queryClient,
      params.locale,
      location.href,
    );
    return { me };
  },
  component: PainelLayout,
});

function PainelLayout() {
  const { me } = Route.useRouteContext();
  const { locale } = Route.useParams();
  return (
    <AppShell me={me} locale={locale}>
      <Outlet />
    </AppShell>
  );
}
