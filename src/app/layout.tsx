import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { FooterWrapper } from '@/components/FooterWrapper';
import { Providers } from '@/components/Providers';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['400', '500', '600', '700', '800', '900'],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://easypdf.io';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'EasyPDF — Enterprise Online PDF Suite & Document Tools',
    template: '%s | EasyPDF',
  },
  description:
    'All-in-one PDF platform. Merge, split, organize, rotate, compress, repair, and OCR PDF documents with instant speed and strict zero-retention privacy.',
  keywords: [
    'PDF merge',
    'PDF split',
    'PDF compress',
    'Organize PDF',
    'Rotate PDF',
    'Repair PDF',
    'OCR PDF',
    'Online PDF editor',
    'Searchable PDF generator',
  ],
  authors: [{ name: 'EasyPDF Team' }],
  creator: 'EasyPDF',
  publisher: 'EasyPDF',
  alternates: {
    canonical: './',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    title: 'EasyPDF — Enterprise Online PDF Suite & Document Tools',
    description:
      'All-in-one PDF platform. Merge, split, organize, rotate, compress, repair, and OCR PDF documents with instant speed and zero-retention privacy.',
    siteName: 'EasyPDF',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EasyPDF — Enterprise Online PDF Suite & Document Tools',
    description:
      'Fast, private, and powerful PDF tools. Merge, split, compress, and OCR documents with zero data retention.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body
        suppressHydrationWarning
        className={`${inter.className} min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 antialiased selection:bg-indigo-500/20 selection:text-indigo-900`}
      >
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <FooterWrapper />
        </Providers>
      </body>
    </html>
  );
}
