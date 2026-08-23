import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'EasyPDF — Enterprise Online PDF Suite & Document Tools',
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
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 antialiased selection:bg-indigo-500/20 selection:text-indigo-900">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
