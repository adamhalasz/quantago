import React from 'react';
import { useLocation } from 'wouter';
import { MainNav } from '@/components/layout/main-nav';
import { Menu, User } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { signOut, useSession } from '@/lib/auth-client';
import { AuthPage } from '@/routes/auth/AuthPage';
import { AppRouter } from './router';

function App() {
  const [location, navigate] = useLocation();
  const { data: session, isPending } = useSession();
  const isAuthenticated = Boolean(session?.user);
  const isAuthRoute = location.startsWith('/auth');

  React.useEffect(() => {
    if (isPending) {
      return;
    }

    if (!isAuthenticated && !isAuthRoute) {
      navigate('/auth');
      return;
    }

    if (isAuthenticated && isAuthRoute) {
      navigate('/');
    }
  }, [isAuthenticated, isAuthRoute, isPending, navigate]);

  const title = location === '/'
    ? 'Backtest'
    : location.startsWith('/bots')
      ? 'Bots'
      : location.startsWith('/strategies')
        ? 'Strategies'
        : location.startsWith('/auth')
          ? 'Authentication'
          : 'Data Explorer';

  if (isPending) {
    return (
      <div className="min-h-screen bg-background px-6 py-10">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card px-8 py-12 text-center shadow-sm">
            <img src="/logo.png" alt="Quantago" className="mx-auto h-16 w-16" />
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-muted-foreground">Quantago</p>
            <h1 className="mt-4 text-2xl font-semibold text-foreground">Loading your workspace</h1>
            <p className="mt-3 text-sm text-muted-foreground">Restoring your session before rendering the app.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background px-6 py-10">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center">
          <AuthPage />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Top Bar */}
      <div className="flex h-16 items-center gap-4 border-b bg-background px-4 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <div className="px-1 py-6">
              <MainNav />
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Quantago" className="h-9 w-9 shrink-0" />
          <span className="text-sm font-semibold uppercase tracking-[0.22em] text-foreground">Quantago</span>
        </div>
        <div className="flex-1" />
        <Button
          onClick={() => {
            if (session?.user) {
              void signOut();
              return;
            }
            navigate('/auth');
          }}
          variant="ghost"
          size="sm"
        >
          <User className="mr-2 h-5 w-5" />
          {session?.user ? 'Sign out' : 'Sign in'}
        </Button>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex">
        {/* Sidebar */}
        <div className="w-72 flex-col border-r bg-background fixed inset-y-0">
          <div className="flex h-16 items-center gap-3 border-b px-6">
            <img src="/logo.png" alt="Quantago" className="h-10 w-10 shrink-0" />
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Quantago</div>
              <div className="text-sm font-medium text-foreground">Research Workspace</div>
            </div>
          </div>
          <div className="flex-1 px-4 py-6">
            <MainNav />
          </div>
          <div className="border-t p-4">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                if (session?.user) {
                  void signOut();
                  return;
                }
                navigate('/auth');
              }}
            >
              <User className="mr-2 h-4 w-4" />
              {session?.user?.email || 'Sign in'}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 ml-72">
          <div className="h-16 border-b px-8 flex items-center">
            <h1 className="font-semibold">{title}</h1>
          </div>
          <div className="p-8">
            <AppRouter />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;