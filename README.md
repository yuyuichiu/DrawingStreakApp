# Drawing Streak App

Drawing Streak App is a cross-platform application (Web and Native Android) designed to help you maintain a daily drawing habit. Inspired by Duolingo's streak system, it tracks your progress, stores your artwork in a gallery, and uses local notifications to keep you on track.

The app is completely **serverless**. It utilizes your personal Google Drive as a cloud database to sync your streak state, tags, and images across devices seamlessly.

## Key Features

- **Cross-Platform:** Built with React, Vite, and Tailwind CSS. Runs on the web and on Android via Capacitor.
- **Serverless & Secure:** Uses your own Google Drive (`db.json` and file storage) to save data. No third-party backend or database is required.
- **Offline-First:** Uses local storage (`@capacitor/preferences`) for fast startup and offline caching, syncing with Google Drive when the network is available.
- **Smart Notifications:** Duolingo-style push notifications (Standard reminders and Urgent "Streak Danger" alerts) managed locally via Capacitor plugins.
- **Custom Tags:** Tag your drawings (e.g., "anatomy", "digital") and filter them in the Gallery.
- **Timezone Aware:** Locks your timezone to prevent "timezone-hopping" and ensures a consistent 4:00 AM streak cutoff time.

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, shadcn/ui
- **Mobile Wrapper:** Capacitor (`@capacitor/core`, `@capacitor/android`)
- **Authentication:** Google Sign-In (`@codetrix-studio/capacitor-google-auth`)
- **Storage:** Google Drive API (REST API v3), Capacitor Preferences

## Documentation

For deep dives into the architecture, Google Cloud setup, and implementation details, refer to the `/docs` folder:

- [Technical Specification](./docs/technical_specification.md)
- [Implementation Plan](./docs/implementation_plan.md)
- [Google Cloud Setup Guide (OAuth Client IDs)](./docs/google_cloud_setup_guide.md)

## Getting Started

### Prerequisites

1. **Node.js** installed on your machine.
2. **Android Studio** (if you plan to run or build the Android app).
3. **Google Cloud OAuth Client IDs** (Web and Android) to enable Google Drive access. Refer to the [Google Cloud Setup Guide](./docs/google_cloud_setup_guide.md).

### 1. Installation

Clone the repository and install dependencies:

```bash
npm install
```

### 2. Configuration

Ensure your Google OAuth Client IDs are correctly placed in the project:
- Capacitor configuration (`capacitor.config.json`)
- Environment variables or config file (`src/config.ts`)

### 3. Running for Web (Development)

Start the local development server:

```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 4. Running for Android

To build the web assets, sync them with Capacitor, and run on an Android device/emulator, use:

```bash
npm run android
```