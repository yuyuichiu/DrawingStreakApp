# Drawing Streak App - Implementation Plan

## Goal Description
Convert your AI-generated React web UI into a cross-platform application (Native Android app via Capacitor + Standard Website). The app will track drawing streaks with Duolingo-style push notifications. It operates completely serverless, using your personal Google Drive as a cloud database to sync your streak state and tags across devices.

## Open Questions & Clarifications

> [!NOTE]
> **Timezone Auto-Detection (Your "Toast" Request)**
> Detecting the timezone automatically (e.g., using `Intl.DateTimeFormat().resolvedOptions().timeZone`) does **not** require any special permissions. 
> As for the alert logic: Asking the user to lock in a timezone during initialization is actually safer for streaks. If they travel, the 4:00 AM cutoff will remain anchored to their *configured* timezone. This is how Duolingo handles it to prevent people from "timezone-hopping" to save streaks. 

> [!NOTE]
> **Google OAuth Client ID Clarification**
> You are completely right! Only the app developer (you) needs to create the Google Cloud Project and generate the Client ID. We will store this Client ID in the app's code/config. When any user logs in, they authorize *your* app to access *their* Google Drive. Users do NOT need to create their own Google Cloud Projects. I have updated the plan to reflect this.

## Proposed Changes

### 1. Capacitor Setup (Android App Wrapper)
- **Install Dependencies:** `@capacitor/core`, `@capacitor/android`.
- **Initialization:** Build the React Vite project and sync it into the Capacitor Android project.

### 2. Onboarding UI & Battery Optimization
- **Timezone Selection:** During initialization, prompt the user to confirm their Timezone. This will be prefilled automatically using standard browser APIs (no permissions required). This locked timezone will govern the 4:00 AM streak cutoff, regardless of physical travel.
- **Battery Optimization (Android Only):** Add a screen on first launch to guide Android users to disable battery optimization, triggering a native Android intent to open the device's battery settings directly. (This button will be hidden via platform checks if the user is on the Web).
- **Login Screen:** Instead of asking for a Client ID, the login screen will simply have a "Sign in with Google" button. The OAuth Client ID will be securely baked into the app's configuration. It will explicitly explain that it will use their Drive space for storing data.

### 3. Google Drive as a Database & Tags System
- **Drive Folder Schema:** (Using the configurable `DRIVE_FOLDER_PREFIX`)
  - `/{DRIVE_FOLDER_PREFIX}/db.json` (Stores global state: streak count, last activity, etc.)
  - `/{DRIVE_FOLDER_PREFIX}/YYYYMMDD/Drawings/{filename}.jpg`
  - `/{DRIVE_FOLDER_PREFIX}/YYYYMMDD/Supplementary/{filename}.ext`
  *(This date-first structure allows dynamically appending new features/data types per day in the future).*
- **Tagging System:** On the Streak Completion upload page, we will add an input field to add self-defined tags (e.g., "anatomy", "digital"). These tags will be saved in `db.json` alongside the drawing metadata, so the Gallery can display them.
- **Sync Logic:** Upon login, the app fetches `db.json`. When completing a streak, the app uploads the files and overwrites `db.json` with the updated streak count and new tags.

### 4. Code Configuration (Avoiding Hardcodes)
We will create a `src/config.ts` file to store global constants so they are easy to change later:
- `OAUTH_CLIENT_ID_WEB`: The Google Cloud Client ID for Web browsers.
- `OAUTH_CLIENT_ID_ANDROID`: The Google Cloud Client ID for the Android APK.
- `DRIVE_FOLDER_PREFIX`: The root folder name in Google Drive (e.g., `DrawingStreakApp` or `DrawingStreakApp_Dev`). This allows separating environments easily.
- `STREAK_CUTOFF_TIME`: `04:00` (4:00 AM).
- `URGENT_ALERT_TIME`: `22:00` (10:00 PM).
- `MAX_PRESCHEDULED_ALERTS`: `5` (Days to schedule ahead for the quiet state).
*(Note: Timezone is removed from here since it will be configured by the user during onboarding and saved locally).*

### 5. Streak Calculation
- **Streak Freeze (1 Day Pause):** 
  - If `current_time > 4:00 AM HKT` and no activity yesterday: The streak remains the same (Paused).
  - If 2 days have passed since `last_activity_at` (crossing the 4 AM HKT boundary twice): The streak resets to 0.

### 6. Notifications (Duolingo-Style)
- **Urgent Alert:** Schedule a high-priority "streak danger" alert for the time defined in `config.ts` (10:00 PM HKT) if no upload has occurred that day.
- **Standard Reminder:** Schedule a daily reminder based on the user's historical habit window.
- **Limitation Workaround:** When closing the app, it will pre-schedule a maximum of `MAX_PRESCHEDULED_ALERTS` (e.g., 5) days worth of alerts. If the user doesn't open the app for those 5 days, the alerts will simply run out (achieving a "quiet state").

## Verification Plan
1. **Google Drive DB:** Log in, upload a drawing with custom tags, and verify `db.json` contains the tags and updates correctly in Google Drive.
2. **Timezone & Streak Logic:** Temporarily mock the system time to simulate crossing the configured cutoff time (both 1 day and 2 days) to verify the Pause and Reset logic works correctly.
3. **Notifications:** Verify that closing the app successfully schedules the configured urgent alert and standard alerts for the next 5 days.
4. **Onboarding:** Verify the battery settings intent correctly opens on an Android device.
