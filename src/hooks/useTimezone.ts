import { useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';

export const useTimezone = () => {
  const [timezone, setTimezone] = useState<string | null>(null);

  useEffect(() => {
    const loadTimezone = async () => {
      const { value } = await Preferences.get({ key: 'user_timezone' });
      if (value) {
        setTimezone(value);
      } else {
        // Auto-detect default
        const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setTimezone(detected);
      }
    };
    loadTimezone();
  }, []);

  const saveTimezone = async (tz: string) => {
    setTimezone(tz);
    await Preferences.set({ key: 'user_timezone', value: tz });
  };

  return { timezone, saveTimezone };
};
