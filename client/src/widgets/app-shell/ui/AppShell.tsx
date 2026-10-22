import { Outlet } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';

/**
 * Main application shell widget with Apple studio mist backdrop and centered stage.
 */
export function AppShell() {
  return (
    <div className="min-h-screen bg-studio-mist flex flex-col font-sf-pro-text text-ink">
      <AppHeader />
      <div className="flex flex-1">
        <AppSidebar />
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
