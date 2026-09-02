import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Molemisi - Farm Management Simulator',
  description: 'A pixel-art farm management simulator inspired by Botswana',
  manifest: '/manifest.json',
  themeColor: '#C05C3C',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="min-h-screen bg-molemisi-night text-molemisi-text">
          {children}
        </main>
      </body>
    </html>
  );
}
