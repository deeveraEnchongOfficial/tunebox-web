'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth/client';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError(null);

    const { error: signUpError } = await authClient.signUp.email({ name, email, password });
    if (signUpError) {
      setError(signUpError.message ?? 'Registration failed');
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
        <h1 className="text-2xl font-bold mb-2">Create your account</h1>
        <p className="text-muted-foreground mb-6">Start building your music library.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              disabled={loading}
              className="bg-input border-white/10"
            />
          </div>
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
              placeholder="At least 8 characters"
              disabled={loading}
              className="bg-input border-white/10"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" size="lg" disabled={loading} className="w-full rounded-full font-bold">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Create account
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline font-semibold">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
