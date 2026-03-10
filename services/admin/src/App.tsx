import { signOut, useSession } from './lib/auth-client';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';

function App() {
  const { data: session, isPending } = useSession();
  const role = session?.user && 'role' in session.user ? session.user.role : null;
  const isAdmin = role === 'admin';

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session?.user) {
    return <AdminLogin />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md rounded-lg border bg-white p-6 shadow-sm space-y-4">
          <h1 className="text-xl font-semibold">Admin access required</h1>
          <p className="text-sm text-muted-foreground">
            This account is authenticated, but it does not have the admin role.
          </p>
          <button
            className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium"
            onClick={() => {
              void signOut();
            }}
            type="button"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return <AdminDashboard />;
}

export default App;
