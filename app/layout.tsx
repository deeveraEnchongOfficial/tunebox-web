import type { Metadata } from 'next';
import './globals.css';

import { PlayerProvider } from '@/lib/player';

export const metadata: Metadata = {
  title: 'TuneBox',
  description: 'Paste. Save. Play. Offline. — Your personal music library.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans antialiased">
        <PlayerProvider>{children}</PlayerProvider>
      </body>
    </html>
  );
}
