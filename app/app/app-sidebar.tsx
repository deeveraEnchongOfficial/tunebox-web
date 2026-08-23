'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Music, Home, Library, Plus, ListMusic, LogOut, Menu, X } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { authClient } from '@/lib/auth/client';
import { cn } from '@/lib/utils/cn';

interface AppSidebarProps {
  user: { id: string; name: string; email: string };
}

const navItems = [
  { href: '/app', label: 'Home', icon: Home },
  { href: '/app/add', label: 'Add Music', icon: Plus },
  { href: '/app/library', label: 'Library', icon: Library },
  { href: '/app/playlists', label: 'Playlists', icon: ListMusic },
];

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  async function handleLogout() {
    await authClient.signOut();
    router.push('/login');
    router.refresh();
  }

  function handleNavClick(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b bg-card px-4 md:hidden">
        <Link href="/app" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary">
            <Music className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-base font-bold">TuneBox</span>
        </Link>
        <Button size="icon" variant="ghost" onClick={() => setOpen(true)}>
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — fixed on mobile (slides in), sticky on desktop */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r bg-card p-4 transition-transform duration-300 md:sticky md:top-0 md:translate-x-0 md:h-screen',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        {/* Close button (mobile only) */}
        <div className="flex items-center justify-between md:hidden">
          <Link href="/app" className="flex items-center gap-2" onClick={() => setOpen(false)}>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
              <Music className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">TuneBox</span>
          </Link>
          <Button size="icon" variant="ghost" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Desktop logo */}
        <Link href="/app" className="hidden items-center gap-2 px-2 py-3 md:flex">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
            <Music className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold">TuneBox</span>
        </Link>

        <Separator className="my-3" />

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                onClick={() => handleNavClick(item.href)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors text-left',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto">
          <Separator className="my-3" />
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 truncate">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </div>
      </aside>
    </>
  );
}
