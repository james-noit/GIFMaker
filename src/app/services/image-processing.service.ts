import { Injectable } from '@angular/core';

export interface ResizedImage {
  dataUrl: string;
  width: number;
  height: number;
}

/** Longest edge for the thumbnail persisted to localStorage. Kept small
 *  on purpose: this is what bounds storage growth as more photos pile up. */
const THUMBNAIL_MAX_DIMENSION = 480;
const THUMBNAIL_QUALITY = 0.82;

@Injectable({ providedIn: 'root' })
export class ImageProcessingService {
  async loadBitmap(file: File): Promise<ImageBitmap> {
    return createImageBitmap(file);
  }

  /** Draws a bitmap into a canvas capped at maxDimension and returns a JPEG data URL. */
  resizeToDataUrl(
    bitmap: ImageBitmap,
    maxDimension = THUMBNAIL_MAX_DIMENSION,
    quality = THUMBNAIL_QUALITY,
  ): ResizedImage {
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('Canvas 2D context unavailable');
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    return { dataUrl, width, height };
  }
}
