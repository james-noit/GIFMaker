import { Injectable } from '@angular/core';
import GIF from 'gif.js';
import { Frame } from '../models/frame.model';

/** Cap the rendered GIF's longest edge to keep encode time and memory sane
 *  even when full-resolution source photos are large. */
const MAX_GIF_DIMENSION = 640;

export interface GifExportProgress {
  fraction: number;
}

@Injectable({ providedIn: 'root' })
export class GifExportService {
  async build(
    frames: Frame[],
    delayMs: number,
    onProgress?: (progress: GifExportProgress) => void,
  ): Promise<Blob> {
    if (frames.length === 0) {
      throw new Error('No frames to export');
    }

    const images = await Promise.all(frames.map((frame) => this.loadDrawable(frame)));
    const maxWidth = Math.max(...images.map((img) => img.width));
    const maxHeight = Math.max(...images.map((img) => img.height));
    const scale = Math.min(1, MAX_GIF_DIMENSION / Math.max(maxWidth, maxHeight));
    const width = Math.max(1, Math.round(maxWidth * scale));
    const height = Math.max(1, Math.round(maxHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    return new Promise<Blob>((resolve, reject) => {
      const gif = new GIF({
        workers: Math.min(4, navigator.hardwareConcurrency || 2),
        quality: 10,
        width,
        height,
        workerScript: '/gif-worker/gif.worker.js',
        repeat: 0,
      });

      gif.on('progress', (fraction) => onProgress?.({ fraction }));
      gif.on('finished', (blob) => resolve(blob));

      for (const image of images) {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        const drawScale = Math.min(width / image.width, height / image.height);
        const drawWidth = image.width * drawScale;
        const drawHeight = image.height * drawScale;
        const dx = (width - drawWidth) / 2;
        const dy = (height - drawHeight) / 2;
        ctx.drawImage(image, dx, dy, drawWidth, drawHeight);
        gif.addFrame(canvas, { copy: true, delay: delayMs });
      }

      try {
        gif.render();
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }

  downloadBlob(blob: Blob, filename = 'gifmaker.gif'): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private loadDrawable(frame: Frame): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load frame ${frame.name}`));
      img.src = frame.fullResUrl ?? frame.thumbnailUrl;
    });
  }
}
