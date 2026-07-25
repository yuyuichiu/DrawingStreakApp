import React, { createContext, useContext, ReactNode } from 'react';
import { useSync } from './useSync';
import { useTimezone } from './useTimezone';
import { AppDatabase } from '../types';

interface AppContextType {
  db: AppDatabase | null;
  isLoading: boolean;
  updateDb: (newDb: AppDatabase) => Promise<void>;
  reload: () => Promise<void>;
  timezone: string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { db, isLoading, updateDb, reload } = useSync();
  const { timezone } = useTimezone();

  return (
    <AppContext.Provider value={{ db: db as AppDatabase, isLoading, updateDb, reload, timezone }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
