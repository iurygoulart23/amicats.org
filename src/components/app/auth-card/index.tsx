import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

export interface AuthCardProps {
  titulo: string;
  locale: string;
  children: ReactNode;
  rodape?: ReactNode;
}

export function AuthCard({ titulo, locale, children, rodape }: AuthCardProps) {
  return (
    <main className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="card bg-base-100 shadow-xl w-full max-w-md">
        <div className="card-body gap-4">
          <Link
            to="/$locale"
            params={{ locale }}
            className="text-primary font-bold text-2xl text-center"
          >
            Amicats
          </Link>
          <h1 className="text-xl font-semibold text-center">{titulo}</h1>
          {children}
          {rodape && (
            <div className="text-sm text-center flex flex-col gap-1">
              {rodape}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
