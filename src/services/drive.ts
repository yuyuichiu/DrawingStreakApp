import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { CONFIG } from '../config';

if (Capacitor.isNativePlatform()) {
  GoogleAuth.initialize({
    clientId: CONFIG.OAUTH_CLIENT_ID_WEB,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
    grantOfflineAccess: true,
  });
}

let webAccessToken = localStorage.getItem('webAccessToken') || '';
let tokenExpiry = parseInt(localStorage.getItem('tokenExpiry') || '0', 10);
let tokenClient: any = null;

const initWebAuth = () => {
  if (!Capacitor.isNativePlatform() && !tokenClient && (window as any).google) {
    tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.OAUTH_CLIENT_ID_WEB,
      scope: 'https://www.googleapis.com/auth/drive.file',
      callback: (tokenResponse: any) => {
        if (tokenResponse && tokenResponse.access_token) {
          webAccessToken = tokenResponse.access_token;
          const expiresIn = tokenResponse.expires_in || 3600;
          tokenExpiry = Date.now() + expiresIn * 1000;
          localStorage.setItem('webAccessToken', webAccessToken);
          localStorage.setItem('tokenExpiry', tokenExpiry.toString());
        }
      },
    });
  }
};

export const DriveService = {
  async signIn() {
    if (Capacitor.isNativePlatform()) {
      try {
        const user = await GoogleAuth.signIn();
        return user;
      } catch (error) {
        console.error('Google Sign-In failed', error);
        throw error;
      }
    } else {
      initWebAuth();
      return new Promise((resolve, reject) => {
        if (!tokenClient) {
           reject(new Error("Google Identity Services script not loaded."));
           return;
        }
        tokenClient.callback = (tokenResponse: any) => {
          if (tokenResponse.error !== undefined) {
            reject(tokenResponse);
          }
          webAccessToken = tokenResponse.access_token;
          const expiresIn = tokenResponse.expires_in || 3600;
          tokenExpiry = Date.now() + expiresIn * 1000;
          localStorage.setItem('webAccessToken', webAccessToken);
          localStorage.setItem('tokenExpiry', tokenExpiry.toString());
          resolve({ id: 'web-user', name: 'Web User' }); // We will fetch real profile later
        };
        tokenClient.requestAccessToken();
      });
    }
  },

  async signOut() {
    if (Capacitor.isNativePlatform()) {
      try {
        await GoogleAuth.signOut();
      } catch (e) {
        console.error('Sign out failed', e);
      }
    } else {
      const clearLocalToken = () => {
         webAccessToken = '';
         tokenExpiry = 0;
         localStorage.removeItem('webAccessToken');
         localStorage.removeItem('tokenExpiry');
      };
      if (webAccessToken && (window as any).google) {
         (window as any).google.accounts.oauth2.revoke(webAccessToken, () => {
             clearLocalToken();
         });
      } else {
         clearLocalToken();
      }
    }
  },

  async getAccessToken() {
    if (Capacitor.isNativePlatform()) {
      try {
        const auth = await GoogleAuth.refresh();
        return auth.accessToken;
      } catch(e) {
        throw e;
      }
    } else {
      if (webAccessToken && Date.now() < tokenExpiry) {
        return webAccessToken;
      }
      
      // Token expired or not found
      webAccessToken = '';
      tokenExpiry = 0;
      localStorage.removeItem('webAccessToken');
      localStorage.removeItem('tokenExpiry');
      throw new Error("No web access token available. Please sign in again.");
    }
  },



  async getOrCreateAppFolder(token: string): Promise<string> {
    const q = `name='${CONFIG.DRIVE_FOLDER_PREFIX}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&spaces=drive`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }
    
    // Create folder
    const metadata = {
      name: CONFIG.DRIVE_FOLDER_PREFIX,
      mimeType: 'application/vnd.google-apps.folder'
    };
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metadata)
    });
    const createData = await createRes.json();
    return createData.id;
  },

  async getOrCreateSubfolder(token: string, parentId: string, folderName: string): Promise<string> {
    const q = `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&spaces=drive`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }
    
    const metadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId]
    };
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metadata)
    });
    const createData = await createRes.json();
    return createData.id;
  },

  async fetchDbJson() {
    const token = await this.getAccessToken();
    const folderId = await this.getOrCreateAppFolder(token);
    // 1. Find the db.json file in the app folder
    const q = `name='db.json' and '${folderId}' in parents and trashed=false`;
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&spaces=drive`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      const fileId = searchData.files[0].id;
      // Fetch content
      const contentRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return await contentRes.json();
    }
    return null; // Not found
  },

  async uploadFile(file: Blob, metadata: any, accessToken: string) {
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);
    
    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      body: form
    });
    return await res.json();
  },

  async saveDbJson(data: any) {
    const token = await this.getAccessToken();
    const folderId = await this.getOrCreateAppFolder(token);
    // Find existing
    const q = `name='db.json' and '${folderId}' in parents and trashed=false`;
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&spaces=drive`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const searchData = await searchRes.json();
    
    const fileContent = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    
    if (searchData.files && searchData.files.length > 0) {
      // Update existing
      const fileId = searchData.files[0].id;
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: fileContent
      });
    } else {
      // Create new
      await this.uploadFile(fileContent, { name: 'db.json', parents: [folderId] }, token);
    }
  },

  async uploadDrawing(file: File, title: string) {
    const token = await this.getAccessToken();
    const folderId = await this.getOrCreateAppFolder(token);
    
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const dateFolderId = await this.getOrCreateSubfolder(token, folderId, dateStr);
    const drawingsFolderId = await this.getOrCreateSubfolder(token, dateFolderId, 'Drawings');

    const metadata = {
      name: title || file.name,
      mimeType: file.type,
      parents: [drawingsFolderId]
    };
    
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);
    
    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,webContentLink,thumbnailLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: form
    });
    const data = await res.json();
    
    // Make it readable so the gallery can display it if needed, or rely on webContentLink/webViewLink.
    // For personal app, webContentLink might require auth cookie, or we can use Drive API to fetch image bytes.
    // Setting to anyone with link can view for simplicity in web UI rendering:
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: 'reader', type: 'anyone' })
      });
    } catch (e) {
      console.error("Could not set permission", e);
    }

    return {
      id: data.id,
      url: `https://drive.google.com/uc?export=view&id=${data.id}`
    };
  },

  async uploadSupplement(file: File) {
    const token = await this.getAccessToken();
    const folderId = await this.getOrCreateAppFolder(token);
    
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const dateFolderId = await this.getOrCreateSubfolder(token, folderId, dateStr);
    const supplementsFolderId = await this.getOrCreateSubfolder(token, dateFolderId, 'Supplements');

    const metadata = {
      name: file.name,
      mimeType: file.type,
      parents: [supplementsFolderId]
    };
    
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);
    
    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,webContentLink,thumbnailLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: form
    });
    const data = await res.json();
    
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: 'reader', type: 'anyone' })
      });
    } catch (e) {
      console.error("Could not set permission for supplement", e);
    }

    return {
      id: data.id,
      name: file.name,
      url: `https://drive.google.com/uc?export=view&id=${data.id}`
    };
  }
};
