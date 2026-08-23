import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { GlobalPlayer } from '@/components/player';
import { PlayerErrorBoundary } from '@/components/player-error-boundary';
import { AppSidebar } from './app-sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  return (
    <div className="flex min-h-screen pb-20">
      <AppSidebar user={session.user} />
      <main className="flex-1 overflow-auto pt-14 md:pt-0 min-h-screen">{children}</main>
      <PlayerErrorBoundary>
        <GlobalPlayer />
      </PlayerErrorBoundary>
    </div>
  );
}
