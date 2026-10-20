import { Outlet, createFileRoute } from '@tanstack/react-router';
import { exigirCargo } from '@/integrations/api/guards';

export const Route = createFileRoute('/$locale/app/_painel/admin')({
  beforeLoad: ({ context, params }) =>
    exigirCargo(context.me, 'adm', params.locale),
  component: Outlet,
});
