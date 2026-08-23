import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-black overflow-hidden p-6">
      {/* Ambient green glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-primary/20 blur-3xl pointer-events-none" />

      <div className="relative flex flex-col items-center gap-8">
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 24 24" className="h-14 w-14 fill-primary" aria-hidden>
            <circle cx="12" cy="12" r="11" />
          </svg>
          <span className="text-3xl font-extrabold tracking-tight">TuneBox</span>
        </div>
        <div className="w-full max-w-md rounded-lg bg-card p-8 text-center">
          <h1 className="text-2xl font-bold mb-2">Welcome to TuneBox</h1>
          <p className="text-muted-foreground mb-8">Paste. Save. Play. Offline.</p>
          <div className="flex flex-col gap-3">
            <Button asChild size="lg" className="w-full">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="w-full">
              <Link href="/register">Create account</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
