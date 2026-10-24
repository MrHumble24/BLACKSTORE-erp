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
}

/** One pill-shaped sidebar navigation link with active state and optional destructive styling. */
export function SidebarItem({
  to,
  icon: Icon,
  label,
  isActive,
  destructive,
  onClick,
}: SidebarItemProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 rounded-full px-4 py-2.5 text-xs font-medium tracking-[-0.01em] transition-all duration-150',
        isActive
          ? 'bg-ink text-white dark:bg-control-gray dark:text-ink shadow-xs'
          : destructive
          ? 'text-launch-orange hover:bg-control-gray/60 hover:text-launch-orange'
          : 'text-slate hover:bg-control-gray/60 hover:text-ink',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
