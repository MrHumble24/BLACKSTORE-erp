import { LoginForm } from '@/features/auth';

/**
 * Public login page rendering the centered Apple-styled login stage.
 */
export function LoginPage() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-studio-mist p-4 font-sf-pro-text text-ink">
      <LoginForm />
    </main>
  );
}
