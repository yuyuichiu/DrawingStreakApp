# Google Cloud Setup Guide (OAuth Client IDs)

To allow the Drawing Streak App to save files to your Google Drive, you need to create a free Google Cloud Project and generate two OAuth Client IDs (one for Web, one for Android). Follow these steps:

## Step 1: Create a Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Log in with your standard Google account.
3. Click the **Project Dropdown** at the top left (next to the Google Cloud logo) and click **New Project**.
4. Name it something like `Drawing Streak App` and click **Create**.
5. Once created, make sure you have selected this new project from the top dropdown.

## Step 2: Enable the Google Drive API
1. In the left sidebar, go to **APIs & Services** > **Library**.
2. Search for **Google Drive API**.
3. Click on it and hit the **Enable** button.

## Step 3: Configure the OAuth Consent Screen
1. Go to **APIs & Services** > **OAuth consent screen**.
2. Choose **External** and click **Create**.
3. **App information:** Fill in the App Name ("Drawing Streak App") and your email for support.
4. **App domain:** You can leave these blank for now (or add your Vercel/Netlify URL later).
5. **Authorized domains:** Leave blank for now (update later if hosting on a custom domain).
6. **Developer contact information:** Enter your email again. Click **Save and Continue**.
7. **Scopes:** Click **Add or Remove Scopes**. Search for Google Drive and select `.../auth/drive.file` (This gives access to files created by this specific app). Click **Save and Continue**.
8. **Test users:** Click **Add Users**. Enter your own Google email address. **(Crucial step!)**. Click **Save and Continue**.
9. Review and click **Back to Dashboard**. *Do not click "Publish App" — leave it in Testing mode.*

## Step 4: Create the Web Client ID
1. Go to **APIs & Services** > **Credentials**.
2. Click **+ Create Credentials** at the top and select **OAuth client ID**.
3. **Application type:** Select **Web application**.
4. **Name:** "Drawing Streak Web".
5. **Authorized JavaScript origins:**
   - Add `http://localhost:5173` (for local Vite development).
   - Add your production URL if you have one (e.g., `https://my-drawing-app.vercel.app`).
6. Click **Create**.
7. **Save the Client ID** (You will paste this into `src/config.ts` as `OAUTH_CLIENT_ID_WEB`).

## Step 5: Create the Android Client ID
1. On the Credentials page, click **+ Create Credentials** > **OAuth client ID** again.
2. **Application type:** Select **Android**.
3. **Name:** "Drawing Streak Android".
4. **Package name:** Enter `com.daveyu.drawingstreak` (This has already been configured in the project).
5. **SHA-1 certificate fingerprint:** 
   - Since you will likely build this in Android Studio or locally, you need your debug keystore fingerprint.
   - Run this in your terminal: `keytool -keystore ~/.android/debug.keystore -list -v` (Password is usually `android`).
   - Copy the `SHA1` fingerprint and paste it here.
6. Click **Create**.
7. **Save the Client ID** (You will paste this into `src/config.ts` as `OAUTH_CLIENT_ID_ANDROID`).

> [!TIP]
> Once you have both Client IDs, let me know, and I can put them directly into our configuration!

## Troubleshooting

### Error 403: access_denied
**Symptom:** You try to sign in and see a Google error screen that says: *Access blocked: "drawing-streak-app" has not completed the Google verification process (Error code 403: access_denied)*.

**Cause:** Your Google Cloud project's OAuth Consent Screen is currently in **Testing** mode (which is correct), but the email address you are trying to log in with has not been added to the **Test users** list.

**Solution:**
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Navigate to **APIs & Services** > **OAuth consent screen** on the left menu.
3. Scroll down to the **Test users** section.
4. Click **+ Add Users**.
5. Enter the email address you are trying to sign in with (e.g., `yuyuichiu448@gmail.com`).
6. Click **Save**. 
7. Return to the Drawing Streak App and try signing in again.
