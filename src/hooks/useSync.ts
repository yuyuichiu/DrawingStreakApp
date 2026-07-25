import { useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import { DriveService } from '../services/drive';
import { AppDatabase, DEFAULT_DB } from '../types';

export const useSync = () => {
  const [db, setDb] = useState<AppDatabase>(DEFAULT_DB);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Try to load from local cache first for instant UI
      const { value } = await Preferences.get({ key: 'db_json_cache' });
      if (value) {
        setDb(JSON.parse(value));
      }

      // 2. Fetch from Drive (if signed in)
      try {
        const remoteDb = await DriveService.fetchDbJson();
        if (remoteDb) {
          setDb(remoteDb);
          await Preferences.set({ key: 'db_json_cache', value: JSON.stringify(remoteDb) });
        } else {
          // If remoteDb is null (doesn't exist yet), initialize it
          setDb(DEFAULT_DB);
          await Preferences.set({ key: 'db_json_cache', value: JSON.stringify(DEFAULT_DB) });
        }
      } catch (e) {
        console.warn("Failed to fetch from drive, maybe not signed in or offline.", e);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateDb = async (newDb: AppDatabase) => {
    setDb(newDb);
    // Optimistic update locally
    await Preferences.set({ key: 'db_json_cache', value: JSON.stringify(newDb) });
    // Upload to drive
    try {
        await DriveService.saveDbJson(newDb);
    } catch(e) {
        console.error("Failed to sync to drive", e);
    }
  };

  return { db, isLoading, updateDb, reload: loadData };
};
