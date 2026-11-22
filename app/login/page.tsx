'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
      rememberMe: remember,
    });
    if (signInError) {
      setError(signInError.message ?? 'Login failed');
      setLoading(false);
      return;
    }
    router.push('/app');
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black p-6">
      <Link href="/" className="flex items-center gap-3 mb-10">
        <svg viewBox="0 0 24 24" className="h-10 w-10 fill-primary" aria-hidden>
          <circle cx="12" cy="12" r="11" />
        </svg>
        <span className="text-2xl font-bold tracking-tight">TuneBox</span>
      </Link>
      <div className="w-full max-w-md rounded-lg bg-card p-8">
        <h1 className="text-2xl font-bold mb-2">Log in to TuneBox</h1>
        <p className="text-muted-foreground mb-6">Welcome back to your music library.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={loading}
              className="bg-input border-white/10"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              className="bg-input border-white/10"
            />
          </div>
          <label htmlFor="remember" className="flex items-center gap-2 cursor-pointer w-fit">
            <input
              id="remember"
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 rounded border-white/20 bg-input accent-primary cursor-pointer"
            />
            <span className="text-sm text-muted-foreground select-none">
              Remember this device
            </span>
          </label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" size="lg" disabled={loading} className="w-full">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Log in
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-primary hover:underline font-semibold">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
