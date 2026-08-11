import { useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import { DriveService } from '../services/drive';
import { AppDatabase, DEFAULT_DB, Tag } from '../types';

/**
 * migrateDb acts as a data hydration/migration step.
 * When the app loads an older JSON payload from local cache or Google Drive,
 * it might be missing newly added properties (e.g. rewardProgress, new settings).
 * This function deeply merges the old data with DEFAULT_DB to guarantee the app
 * always works with the latest complete AppDatabase schema.
 */
const migrateDb = (db: AppDatabase): AppDatabase => {
  if (!db) return DEFAULT_DB;

  let needsMigration = false;
  // Shallow merge with DEFAULT_DB to ensure all top-level keys exist
  const newDb = { ...DEFAULT_DB, ...db };
  
  // Deep merge settings to ensure all settings keys exist
  newDb.settings = { ...DEFAULT_DB.settings, ...(db.settings || {}) };

  if (!newDb.drawings) {
    newDb.drawings = [];
  }
  
  if (!db.definedTags) {
    needsMigration = true;
    const tagSet = new Set<string>();
    newDb.drawings.forEach(d => {
      if (d.tags) {
        d.tags.forEach(t => tagSet.add(t));
      }
    });
    
    newDb.definedTags = Array.from(tagSet).map(name => {
      const hue = Math.floor(Math.random() * 360);
      return {
        id: crypto.randomUUID(),
        name,
        color: `hsl(${hue}, 70%, 50%)`
      };
    });
  }
  
  // Check if any new keys were added that were missing in the old db
  for (const key of Object.keys(DEFAULT_DB)) {
    if (!(key in db)) needsMigration = true;
  }
  if (db.settings) {
    for (const key of Object.keys(DEFAULT_DB.settings)) {
      if (!(key in db.settings)) needsMigration = true;
    }
  }

  return needsMigration ? newDb : db;
};

/**
 * useSync handles the core data loading and saving logic.
 * It provides a reactive 'db' state to the app, initially loading from
 * local Preferences for instant UI, then fetching from Google Drive (if available).
 * It also manages optimistic local updates and cloud saving.
 */
export const useSync = () => {
  const [db, setDb] = useState<AppDatabase>(DEFAULT_DB);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Try to load from local cache first for instant UI
      const { value } = await Preferences.get({ key: 'db_json_cache' });
      if (value) {
        setDb(migrateDb(JSON.parse(value)));
      }

      // 2. Fetch from Drive (if signed in)
      try {
        const remoteDb = await DriveService.fetchDbJson();
        if (remoteDb) {
          const migratedRemote = migrateDb(remoteDb);
          setDb(migratedRemote);
          await Preferences.set({ key: 'db_json_cache', value: JSON.stringify(migratedRemote) });
          // Optionally, we could DriveService.saveDbJson(migratedRemote) here if we wanted to enforce it remote immediately,
          // but relying on the next user action is usually safer to avoid loops.
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
    newDb.updatedAt = Date.now();
    setDb(newDb);
    // Optimistic update locally
    await Preferences.set({ key: 'db_json_cache', value: JSON.stringify(newDb) });
    // Upload to drive
    try {
        const remoteDb = await DriveService.fetchDbJson();
        if (remoteDb && remoteDb.updatedAt && newDb.updatedAt && remoteDb.updatedAt > newDb.updatedAt) {
          console.warn("Remote database is newer, pulling remote changes instead of overwriting.");
          const migratedRemote = migrateDb(remoteDb);
          setDb(migratedRemote);
          await Preferences.set({ key: 'db_json_cache', value: JSON.stringify(migratedRemote) });
          return;
        }
        await DriveService.saveDbJson(newDb);
    } catch(e) {
        console.error("Failed to sync to drive", e);
    }
  };

  return { db, isLoading, updateDb, reload: loadData };
};
