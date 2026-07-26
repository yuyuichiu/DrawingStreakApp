import React, { useState, useEffect } from "react";
import { DriveService } from "../../services/drive";

import { Filesystem, Directory } from '@capacitor/filesystem';

const imagePromises = new Map<string, Promise<string>>();

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
};

export function DriveImage({ fileId, fallbackUrl, alt, className, style }: { fileId: string, fallbackUrl?: string, alt: string, className?: string, style?: any }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchImage = async () => {
      if (!imagePromises.has(fileId)) {
        const p = (async () => {
          try {
            const { data } = await Filesystem.readFile({
              path: `img_cache_${fileId}.txt`,
              directory: Directory.Cache
            });
            if (data && typeof data === 'string') return data;
          } catch (e) {
            // Not in cache, proceed to fetch
          }

          const token = await DriveService.getAccessToken();
          const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
          const rawBlob = await res.blob();
          // Force image mime type in case Drive API returns application/octet-stream
          const mimeType = rawBlob.type.startsWith('image/') ? rawBlob.type : 'image/jpeg';
          const blob = new Blob([rawBlob], { type: mimeType });
          
          const base64DataUrl = await blobToBase64(blob);
          
          Filesystem.writeFile({
            path: `img_cache_${fileId}.txt`,
            data: base64DataUrl,
            directory: Directory.Cache
          }).catch(console.error);

          return base64DataUrl;
        })();
        imagePromises.set(fileId, p);
      }

      try {
        const resultSrc = await imagePromises.get(fileId);
        if (active && resultSrc) {
          setSrc(resultSrc);
        }
      } catch (e) {
        if (imagePromises.has(fileId)) {
          imagePromises.delete(fileId);
        }
        if (active) {
          console.error("Failed to load image", e);
          if (fallbackUrl) {
            setSrc(fallbackUrl);
          }
        }
      }
    };

    fetchImage();
    return () => {
      active = false;
    };
  }, [fileId]);

  const handleError = () => {
    // If the image fails to load, remove it from cache
    Filesystem.deleteFile({
      path: `img_cache_${fileId}.txt`,
      directory: Directory.Cache
    }).catch(() => {});
    
    // Fallback to the provided URL or just keep it broken
    if (fallbackUrl && src !== fallbackUrl) {
      setSrc(fallbackUrl);
    }
  };

  if (!src) {
    return <div className={`animate-pulse bg-secondary ${className || ''}`} style={style} />;
  }

  return <img src={src} alt={alt} className={className} style={style} onError={handleError} />;
}
