import { CONFIG } from '../config';
import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';

export const StreakService = {
  /**
   * Evaluates the streak status based on the last activity date and configured timezone.
   * Cutoff is 4:00 AM of the configured timezone.
   */
  evaluateStreak(currentStreak: number, lastActivityAt: string | null, timezone: string) {
    if (!lastActivityAt) {
      return { streak: 0, status: 'NO_ACTIVITY' };
    }

    const now = new Date();
    
    const lastStreakDay = this.getStreakDay(new Date(lastActivityAt), timezone);
    const currentStreakDay = this.getStreakDay(now, timezone);

    const diffMs = new Date(currentStreakDay).getTime() - new Date(lastStreakDay).getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return { streak: currentStreak, status: 'ALREADY_COMPLETED_TODAY' };
    } else if (diffDays === 1) {
      // Normal continuation
      return { streak: currentStreak, status: 'READY_TO_CONTINUE' };
    } else if (diffDays === 2) {
      // 1 Day missed (Streak Freeze)
      return { streak: currentStreak, status: 'PAUSED' };
    } else {
      // 2 or more days missed -> Reset
      return { streak: 0, status: 'RESET' };
    }
  },

  getStreakDay(date: Date, timezone: string): string {
    const cutoffHour = parseInt(CONFIG.STREAK_CUTOFF_TIME.split(':')[0], 10);
    // Shift the UTC time back by the cutoff hours. 
    // This perfectly aligns the logical "streak day" with the calendar day in that timezone.
    const shiftedUtcDate = new Date(date.getTime() - cutoffHour * 60 * 60 * 1000);
    return formatInTimeZone(shiftedUtcDate, timezone, 'yyyy-MM-dd');
  },
  
  getNextCutoffTime(timezone: string): Date {
      const now = new Date();
      const zonedNow = toZonedTime(now, timezone);
      const cutoffHour = parseInt(CONFIG.STREAK_CUTOFF_TIME.split(':')[0], 10);
      
      let targetZoned = new Date(
        zonedNow.getFullYear(),
        zonedNow.getMonth(),
        zonedNow.getDate(),
        cutoffHour,
        0,
        0,
        0
      );
      
      if (zonedNow.getHours() >= cutoffHour) {
          targetZoned.setDate(targetZoned.getDate() + 1);
      }
      
      return fromZonedTime(targetZoned, timezone);
  }
};
