'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Library, Plus, ListMusic, LogOut } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth/client';
import { cn } from '@/lib/utils/cn';

interface AppSidebarProps {
  user: { id: string; name: string; email: string };
}

const navItems = [
  { href: '/app', label: 'Home', icon: Home },
  { href: '/app/add', label: 'Add Music', icon: Plus },
  { href: '/app/library', label: 'Your Library', icon: Library },
  { href: '/app/playlists', label: 'Playlists', icon: ListMusic },
];

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await authClient.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 h-full gap-2 px-2 py-2">
      {/* Top nav box — black, rounded */}
      <div className="bg-black rounded-lg p-4">
        <Link href="/app" className="flex items-center gap-2 mb-5">
          <svg viewBox="0 0 24 24" className="h-8 w-8 fill-primary" aria-hidden>
            <circle cx="12" cy="12" r="11" />
          </svg>
          <span className="text-lg font-bold tracking-tight">TuneBox</span>
        </Link>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-4 rounded-md px-3 py-2 text-sm font-bold transition-colors',
                  active
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-6 w-6" strokeWidth={active ? 2.5 : 2} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Library box — black, rounded, scrollable */}
      <div className="bg-black rounded-lg flex-1 min-h-0 flex flex-col p-2">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Library className="h-6 w-6" />
            <span className="font-bold">Your Library</span>
          </div>
          <Link
            href="/app/playlists"
            className="text-muted-foreground hover:text-foreground"
            title="Create playlist"
          >
            <Plus className="h-5 w-5" />
          </Link>
        </div>
        <div className="flex flex-col gap-2 px-2 mt-2 overflow-y-auto scrollbar-thin">
          <Link
            href="/app/library"
            className="flex items-center gap-3 rounded-md p-2 hover:bg-white/5 transition-colors"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded bg-linear-to-br from-primary/80 to-primary/40">
              <ListMusic className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">All songs</p>
              <p className="text-xs text-muted-foreground">Your full library</p>
            </div>
          </Link>
          <Link
            href="/app/playlists"
            className="flex items-center gap-3 rounded-md p-2 hover:bg-white/5 transition-colors"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded bg-linear-to-br from-indigo-500/80 to-purple-500/40">
              <ListMusic className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">Playlists</p>
              <p className="text-xs text-muted-foreground">Your collections</p>
            </div>
          </Link>
        </div>
      </div>

      {/* User footer */}
      <div className="bg-black rounded-lg p-2 flex items-center gap-3">
        <Avatar className="h-9 w-9 rounded-full">
          <AvatarFallback className="rounded-full bg-secondary text-xs">
            {user.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{user.name}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          title="Log out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </aside>
  );
}
