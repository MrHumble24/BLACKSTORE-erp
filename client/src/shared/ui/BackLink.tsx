import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface BackLinkProps {
  to: string;
  label: string;
}

/** Breadcrumb-style back link to a list view. */
export function BackLink({ to, label }: BackLinkProps) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 text-xs text-slate hover:text-ink transition-colors"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}
