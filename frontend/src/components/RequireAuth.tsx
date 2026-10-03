import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LoaderCircleIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function RequireAuth({ children }: {children: React.ReactNode;}) {
  const { token, status } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (status !== 'authenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm font-semibold text-taupe-700">
        <LoaderCircleIcon className="h-4 w-4 animate-spin" aria-hidden />
        Confirming your session…
      </div>);

  }

  return <>{children}</>;
}