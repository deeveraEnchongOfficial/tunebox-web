'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Plus, Library, ListMusic } from 'lucide-react';

import { cn } from '@/lib/utils/cn';

const tabs = [
  { href: '/app', label: 'Home', icon: Home },
  { href: '/app/add', label: 'Add', icon: Plus },
  { href: '/app/library', label: 'Library', icon: Library },
  { href: '/app/playlists', label: 'Playlists', icon: ListMusic },
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center justify-around bg-black border-t border-white/5">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-6 w-6" strokeWidth={active ? 2.5 : 2} />
            <span className="text-[10px] font-semibold">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
