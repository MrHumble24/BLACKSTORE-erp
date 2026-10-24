import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/shared/lib';

export interface SidebarItemProps {
  to: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  destructive?: boolean;
  onClick?: () => void;
  isShrunk?: boolean;
}

/** One pill-shaped sidebar navigation link with active state and optional shrunk icon rail styling. */
export function SidebarItem({
  to,
  icon: Icon,
  label,
  isActive,
  destructive,
  onClick,
  isShrunk,
}: SidebarItemProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex items-center transition-all duration-150',
        isShrunk
          ? 'h-10 w-10 mx-auto justify-center rounded-xl p-0'
          : 'gap-3 rounded-full px-4 py-2.5 text-xs font-medium tracking-[-0.01em]',
        isActive
          ? 'bg-ink text-white dark:bg-control-gray dark:text-ink shadow-xs'
          : destructive
          ? 'text-launch-orange hover:bg-control-gray/60 hover:text-launch-orange'
          : 'text-slate hover:bg-control-gray/60 hover:text-ink',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {isShrunk ? (
        <span className="sr-only">{label}</span>
      ) : (
        <span className="truncate">{label}</span>
      )}
    </Link>
  );
}
