import Link from 'next/link';
import { Music } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
          <Music className="h-6 w-6 text-primary-foreground" />
        </div>
        <span className="text-2xl font-bold">TuneBox</span>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to TuneBox</CardTitle>
          <CardDescription>Paste. Save. Play. Offline.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild size="lg">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/register">Create account</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
