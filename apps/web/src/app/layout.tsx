import type { Metadata } from 'next';
import { IBM_Plex_Sans } from 'next/font/google';
import '@/styles/globals.css';
import { Providers } from './providers';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-ibm',
});

export const metadata: Metadata = {
  title: 'Project Tracker',
  description: 'Internal hierarchical team project tracker',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={ibmPlexSans.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
