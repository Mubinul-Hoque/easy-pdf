'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Footer } from '@/components/Footer';

export const FooterWrapper: React.FC = () => {
  const pathname = usePathname();

  // Hide consumer footer on Admin dashboard and Admin login pages
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return <Footer />;
};

export default FooterWrapper;
