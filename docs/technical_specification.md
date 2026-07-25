# Technical Specification: Drawing Streak App

## 1. Architecture Overview
- **Frontend Framework:** React 18, Vite, Tailwind CSS (existing).
- **Deployment Targets:** Android (via Capacitor) AND Web (hosted as a standard website/PWA).
- **Backend/Database:** Serverless. Google Drive acts as the remote database (`db.json`) and file storage.
- **Local Storage:** `@capacitor/preferences` (which falls back to `localStorage` on the web) for offline caching and fast reads on startup.

## 2. Data Models (`db.json` Schema)
The global state will be stored at `/{DRIVE_FOLDER_PREFIX}/db.json`. 

```json
{
  "version": 1,
  "userState": {
    "streakCount": 5,
    "lastActivityAt": "2026-07-27T18:30:00.000Z",
    "habitWindowUtc": 10,
    "timezone": "Asia/Hong_Kong"
  },
  "drawings": [
    {
      "id": "123456789", 
      "date": "2026-07-27",
      "driveFileId": "1A2B3C...",
      "tags": ["anatomy", "digital"]
    }
  ]
}
```
*Note: The `drawings` array serves as a fast-lookup index for the Gallery, preventing the need to crawl the Drive folder structure every time.*

## 3. Google Drive API Integration
- **Authentication:** Use `@codetrix-studio/capacitor-google-auth`. This plugin supports both native Android Sign-In (using the Android Client ID) and standard Web OAuth popups (using the Web Client ID). 
- **CORS (Web Only):** The web hosting domain must be added to the Google Cloud Console's "Authorized JavaScript origins" to allow Drive API requests.
- **API Endpoints (Drive REST API v3):**
  - **Create Folders:** `POST https://www.googleapis.com/drive/v3/files` (MimeType: `application/vnd.google-apps.folder`).
  - **Upload Files (Multipart):** `POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`. Used for uploading the image and the metadata together.
  - **Read/Write db.json:** Fetch using `GET` with `alt=media`, update using `PATCH /upload/drive/v3/files/{fileId}`.
- **Offline First Strategy:** The app will always read from local Capacitor Preferences on boot. When the network is available, it will silently fetch the latest `db.json` from Drive and merge/overwrite local state.

## 4. Local Notification Logic (`@capacitor/local-notifications`)
- **Web vs Android:** On Android, we use native alarms. On the Web, we will request standard browser Notification permissions and utilize a Service Worker (PWA) or simple in-browser timeouts if the tab remains open.
- **Trigger Events:** Notifications are recalculated and scheduled whenever the app is sent to the background (using Capacitor App API `appStateChange` on Android, or `visibilitychange` on Web).
- **Calculation Rules:**
  1. Clear all currently scheduled notifications.
  2. Calculate `T` = next 4:00 AM of the configured timezone.
  3. **Urgent Alert:** Schedule for `T - 6 hours` (10:00 PM).
  4. **Standard Alerts:** Schedule for `habitWindowUtc - 1 hour`.
  5. Repeat step 2-4 in a loop for `MAX_PRESCHEDULED_ALERTS` (5) days into the future.

## 5. Application Code Structure additions
```text
src/
├── config.ts              # Global constants (Client ID, Prefix, Times)
├── services/
│   ├── drive.ts           # Google Drive API wrappers (fetch, upload, sync)
│   ├── notifications.ts   # Capacitor local notification scheduling logic
│   └── streak.ts          # Core logic for evaluating 4AM cutoffs and pauses
├── hooks/
│   ├── useSync.ts         # Hook to manage local/remote db.json syncing
│   └── useTimezone.ts     # Hook to read/lock timezone settings
```

## 6. Key Capacitor Plugins Required
- `@capacitor/core`, `@capacitor/android`
- `@capacitor/preferences` (Local storage for config and db.json cache)
- `@capacitor/local-notifications` (Duolingo-style alerts)
- `@codetrix-studio/capacitor-google-auth` (Google Sign In)
- `@capacitor-community/device-settings` (To open battery optimization settings)
- `@capacitor/filesystem` (To temporarily hold files before Drive upload)
