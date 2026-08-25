'use client';

import React from 'react';
import { SettingsProvider } from '@/context/SettingsContext';
import { ToolsProvider } from '@/context/ToolsContext';
import { AuthProvider } from '@/context/AuthContext';

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SettingsProvider>
      <ToolsProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ToolsProvider>
    </SettingsProvider>
  );
};

export default Providers;
