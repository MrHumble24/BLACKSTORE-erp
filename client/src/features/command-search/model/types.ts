import type React from 'react';

export type CommandCategory = 'lookup' | 'actions' | 'pages';

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: CommandCategory;
  icon: React.ComponentType<{ className?: string }>;
  keywords?: string[];
  shortcut?: string;
  perform: () => void;
}
