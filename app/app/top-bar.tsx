'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

export function TopBar() {
  const router = useRouter();
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;
    const onScroll = () => setScrolled(main.scrollTop > 64);
    onScroll();
    main.addEventListener('scroll', onScroll, { passive: true });
    return () => main.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={cn(
        'sticky top-0 z-30 flex items-center gap-4 px-4 md:px-6 h-16 transition-colors duration-300',
        scrolled ? 'bg-background/95 backdrop-blur' : 'bg-transparent',
      )}
    >
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 rounded-full bg-black/70 text-white"
          onClick={() => router.back()}
          title="Go back"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8 rounded-full bg-black/70 text-white"
          onClick={() => router.forward()}
          title="Go forward"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
