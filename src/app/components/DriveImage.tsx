import React, { useState, useEffect } from "react";
import { DriveService } from "../../services/drive";

const imagePromises = new Map<string, Promise<string>>();

export function DriveImage({ fileId, fallbackUrl, alt, className, style }: { fileId: string, fallbackUrl?: string, alt: string, className?: string, style?: any }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchImage = async () => {
      if (!imagePromises.has(fileId)) {
        const p = (async () => {
          const token = await DriveService.getAccessToken();
          const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
          const blob = await res.blob();
          return URL.createObjectURL(blob);
        })();
        imagePromises.set(fileId, p);
      }

      try {
        const objectUrl = await imagePromises.get(fileId);
        if (active && objectUrl) {
          setSrc(objectUrl);
        }
      } catch (e) {
        if (imagePromises.has(fileId)) {
          imagePromises.delete(fileId);
        }
        if (active) console.error("Failed to load image", e);
      }
    };

    fetchImage();
    return () => {
      active = false;
    };
  }, [fileId]);

  if (!src) {
    return <div className={`animate-pulse bg-secondary ${className || ''}`} style={style} />;
  }

  return <img src={src} alt={alt} className={className} style={style} />;
}
