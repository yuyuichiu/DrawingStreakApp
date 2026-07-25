/// <reference types="vite/client" />
export const CONFIG = {
  // Replace these with the actual Client IDs you get from Google Cloud Console
  OAUTH_CLIENT_ID_WEB: import.meta.env.VITE_OAUTH_CLIENT_ID_WEB as string,
  OAUTH_CLIENT_ID_ANDROID: import.meta.env.VITE_OAUTH_CLIENT_ID_ANDROID as string,
  
  // The root folder prefix in Google Drive
  DRIVE_FOLDER_PREFIX: "DrawingStreakApp",
  
  // Streak cutoff time in 24-hour format (e.g., 04:00 is 4 AM)
  STREAK_CUTOFF_TIME: "04:00",
  
  // High-priority urgent alert time (e.g., 22:00 is 10 PM)
  URGENT_ALERT_TIME: "22:00",
  
  // Maximum number of days to pre-schedule notifications when app is closed
  MAX_PRESCHEDULED_ALERTS: 5
};
