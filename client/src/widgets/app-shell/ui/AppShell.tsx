import { Outlet } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { CommandDialog } from '@/features/command-search';

/**
 * Main application shell widget with Apple studio mist backdrop and centered stage.
 */
export function AppShell() {
  return (
    <div className="min-h-screen bg-studio-mist flex flex-col font-sf-pro-text text-ink">
      <AppHeader />
      <div className="flex flex-1">
        <AppSidebar />
        <main className="flex-1 p-3 sm:p-5 lg:p-8 overflow-y-auto min-w-0">
          <div className="max-w-[1600px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
      <CommandDialog />
    </div>
  );
}

