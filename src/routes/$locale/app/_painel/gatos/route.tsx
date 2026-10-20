import { Outlet, createFileRoute } from '@tanstack/react-router';
import { exigirCargo } from '@/integrations/api/guards';

export const Route = createFileRoute('/$locale/app/_painel/gatos')({
  beforeLoad: ({ context, params }) =>
    exigirCargo(context.me, 'voluntario', params.locale),
  component: Outlet,
});
