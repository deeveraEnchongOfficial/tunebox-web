import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { GlobalPlayer } from '@/components/player';
import { PlayerErrorBoundary } from '@/components/player-error-boundary';
import { AppSidebar } from './app-sidebar';
import { BottomTabBar } from './bottom-tab-bar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  return (
    <div className="flex flex-col h-screen bg-black text-foreground">
      <div className="flex flex-1 min-h-0">
        <AppSidebar user={session.user} />
        <main className="flex-1 overflow-y-auto scrollbar-thin bg-background rounded-lg my-2 mr-2 ml-0 md:ml-2 min-h-0 pb-24 md:pb-0">
          {children}
        </main>
      </div>
      <PlayerErrorBoundary>
        <GlobalPlayer />
      </PlayerErrorBoundary>
      <BottomTabBar />
    </div>
  );
}
