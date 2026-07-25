import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { CONFIG } from '../config';
import { StreakService } from './streak';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export const NotificationService = {
  async requestPermissions() {
    if (Capacitor.getPlatform() === 'web') {
      if ('Notification' in window) {
        const result = await Notification.requestPermission();
        return result === 'granted';
      }
      return false;
    } else {
      const { display } = await LocalNotifications.requestPermissions();
      return display === 'granted';
    }
  },

  async scheduleAlerts(timezone: string, settings: any, todayDone: boolean = false) {
    if (Capacitor.getPlatform() === 'web') {
      console.log('Web notifications scheduling logic goes here (e.g. Service Worker)');
      return;
    }
    
    // Clear existing
    await LocalNotifications.cancel({ notifications: (await LocalNotifications.getPending()).notifications });

    if (!settings.notifications) return;

    const nextCutoff = StreakService.getNextCutoffTime(timezone);
    const notificationsToSchedule = [];
    
    // Schedule for the next MAX_PRESCHEDULED_ALERTS days
    for (let i = 0; i < CONFIG.MAX_PRESCHEDULED_ALERTS; i++) {
        const dayOffset = i * 24 * 60 * 60 * 1000;
        // nextCutoff is the 4 AM cutoff for the CURRENT streak day.
        const currentCutoffTime = nextCutoff.getTime() + dayOffset;
        
        // currentCutoffTime represents the cutoff for the "streak day"
        // Let's create a zoned date representing the calendar day of that cutoff minus 1 day, because the cutoff is at 4AM of the NEXT day.
        // E.g., for streak day "Oct 1st", the cutoff is "Oct 2nd 4:00 AM".
        // We want to schedule morning alert on "Oct 1st 9:00 AM" and evening alert on "Oct 1st 8:00 PM".
        const zonedCutoff = toZonedTime(new Date(currentCutoffTime), timezone);
        
        const year = zonedCutoff.getFullYear();
        const month = zonedCutoff.getMonth();
        const cutoffDateNum = zonedCutoff.getDate();
        
        // 1. Morning Alert
        if (settings.morningAlert && settings.morningTime) {
            const [hour, minute] = settings.morningTime.split(':').map(Number);
            const alertDateNum = hour >= 4 ? cutoffDateNum - 1 : cutoffDateNum;
            const zonedMorning = new Date(year, month, alertDateNum, hour, minute, 0, 0);
            const morningDate = fromZonedTime(zonedMorning, timezone);
            
            if (morningDate.getTime() > Date.now()) {
                notificationsToSchedule.push({
                    id: i * 2 + 1,
                    title: 'Time to draw!',
                    body: 'Keep your streak going today.',
                    schedule: { at: morningDate }
                });
            }
        }
        
        // 2. Evening Alert
        if (settings.eveningAlert && settings.eveningTime) {
            const [hour, minute] = settings.eveningTime.split(':').map(Number);
            const alertDateNum = hour >= 4 ? cutoffDateNum - 1 : cutoffDateNum;
            const zonedEvening = new Date(year, month, alertDateNum, hour, minute, 0, 0);
            const eveningDate = fromZonedTime(zonedEvening, timezone);
            
            if (eveningDate.getTime() > Date.now()) {
                if (!(todayDone && i === 0)) {
                    notificationsToSchedule.push({
                        id: i * 2 + 2,
                        title: '🚨 Streak in Danger!',
                        body: 'You have until 4 AM to save your drawing streak!',
                        schedule: { at: eveningDate }
                    });
                }
            }
        }
    }
    
    if (notificationsToSchedule.length > 0) {
        await LocalNotifications.schedule({ notifications: notificationsToSchedule });
    }
  },

  async testNotification() {
    if (Capacitor.getPlatform() === 'web') {
      if ('Notification' in window && Notification.permission === 'granted') {
        new window.Notification('Test Notification', { body: 'This is a test notification. Notifications are working!' });
      } else {
        alert("Notification permissions not granted or not supported on web.");
      }
      return;
    }
    
    await LocalNotifications.schedule({
      notifications: [{
        id: 99999,
        title: 'Test Notification',
        body: 'This is a test notification. Mobile notifications are working!',
        schedule: { at: new Date(Date.now() + 1000) } // Schedule for 1 second in the future
      }]
    });
  }
};
