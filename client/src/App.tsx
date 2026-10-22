import { AppProviders } from './app/providers';
import { AppRoutes } from './app/routes';

/**
 * Root component rendering providers and route tree.
 */
export function App() {
  return (
    <AppProviders>
      <AppRoutes />
    </AppProviders>
  );
}

export default App;
