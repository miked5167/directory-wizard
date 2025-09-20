import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ErrorBoundaryProvider } from '../components/errors/ErrorBoundaryProvider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Directory Wizard - Create Your Business Directory',
  description: 'Multi-tenant Directory Creation Wizard - Create and manage directory websites through a guided interface.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ErrorBoundaryProvider>
          {children}
        </ErrorBoundaryProvider>
      </body>
    </html>
  );
}
