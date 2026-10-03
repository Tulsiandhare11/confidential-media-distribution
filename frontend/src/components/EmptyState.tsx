import React from "react";
import { BoxIcon } from "lucide-react";
interface EmptyStateProps {
  icon: BoxIcon;
  title: string;
  body: string;
  action?: React.ReactNode;
}
export function EmptyState({
  icon: Icon,
  title,
  body,
  action
}: EmptyStateProps) {
  return <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="surface-soft flex h-12 w-12 items-center justify-center">
        <Icon className="h-5 w-5 text-taupe-600" aria-hidden />
      </div>
      <h3 className="mt-4 text-base font-extrabold text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-taupe-700">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>;
}