import React, { useState, useEffect, useRef } from "react";
import { DriveService } from "../../services/drive";
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { ImageOff, Loader2 } from "lucide-react";

const imagePromises = new Map<string, Promise<string>>();

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
};

export function DriveImage({ fileId, fallbackUrl, alt, className, style, loaderType = 'pulse', preload = false }: { fileId: string, fallbackUrl?: string, alt: string, className?: string, style?: any, loaderType?: 'pulse' | 'spinner', preload?: boolean }) {
  const [src, setSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(preload);
  const elementRef = useRef<any>(null);

  useEffect(() => {
    if (preload) {
      setIsVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    if (elementRef.current) observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, [preload]);

  useEffect(() => {
    setSrc(null);
    setHasError(false);
    if (!isVisible) return;

    let active = true;
    const controller = new AbortController();

    const fetchImage = async () => {
      if (!imagePromises.has(fileId)) {
        const p = (async () => {
          try {
            const { data } = await Filesystem.readFile({
              path: `img_cache_${fileId}.txt`,
              directory: Directory.Cache,
              encoding: Encoding.UTF8
            });
            if (data && typeof data === 'string' && data.startsWith('data:')) return data;
          } catch (e) {
            // Not in cache, proceed to fetch
          }

          const token = await DriveService.getAccessToken();
          const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal
          });
          if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
          const rawBlob = await res.blob();
          const mimeType = rawBlob.type.startsWith('image/') ? rawBlob.type : 'image/jpeg';
          const blob = new Blob([rawBlob], { type: mimeType });
          
          const base64DataUrl = await blobToBase64(blob);
          
          Filesystem.writeFile({
            path: `img_cache_${fileId}.txt`,
            data: base64DataUrl,
            directory: Directory.Cache,
            encoding: Encoding.UTF8
          }).catch(console.error);

          return base64DataUrl;
        })();
        imagePromises.set(fileId, p);
      }

      try {
        const resultSrc = await imagePromises.get(fileId);
        if (active && resultSrc) {
          setSrc(resultSrc);
          // Free memory from the Map after a short delay so concurrent requests still share the promise
          setTimeout(() => {
             if (imagePromises.has(fileId)) imagePromises.delete(fileId);
          }, 500);
        }
      } catch (e: any) {
        if (imagePromises.has(fileId)) {
          imagePromises.delete(fileId);
        }
        if (active && e.name !== 'AbortError') {
          console.error("Failed to load image", e);
          setHasError(true);
        }
      }
    };

    fetchImage();
    return () => {
      active = false;
      controller.abort();
    };
  }, [fileId, isVisible]);

  const handleError = () => {
    Filesystem.deleteFile({
      path: `img_cache_${fileId}.txt`,
      directory: Directory.Cache
    }).catch(() => {});
    setHasError(true);
  };

  if (hasError) {
    return (
      <div ref={elementRef} className={`flex items-center justify-center bg-secondary text-muted-foreground ${className || ''}`} style={style}>
        <ImageOff size={24} />
      </div>
    );
  }

  if (!src) {
    if (loaderType === 'spinner') {
      return (
        <div ref={elementRef} className={`flex items-center justify-center text-muted-foreground ${className || ''}`} style={style}>
          <Loader2 className="animate-spin" size={32} />
        </div>
      );
    }
    return <div ref={elementRef} className={`animate-pulse bg-secondary ${className || ''}`} style={style} />;
  }

  return <img ref={elementRef} src={src} alt={alt} className={className} style={style} onError={handleError} />;
}
