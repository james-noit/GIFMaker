import { Injectable, computed, signal } from '@angular/core';
import { Frame, StoredFrame, TimelineState } from '../models/frame.model';
import { ImageProcessingService } from './image-processing.service';

const STORAGE_KEY = 'gifmaker.timeline';
const DEFAULT_DELAY_MS = 500;
const PERSIST_DEBOUNCE_MS = 300;

@Injectable({ providedIn: 'root' })
export class FrameStoreService {
  readonly frames = signal<Frame[]>([]);
  readonly delayMs = signal<number>(DEFAULT_DELAY_MS);
  readonly count = computed(() => this.frames().length);

  /** Frames added this session are full quality; frames restored from a
   *  previous session only have their thumbnail until re-uploaded. */
  readonly hasDegradedFrames = computed(() =>
    this.frames().some((frame) => frame.fullResUrl === null),
  );

  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly imageProcessing: ImageProcessingService) {
    this.restore();
  }

  async addFiles(files: FileList | File[]): Promise<void> {
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    for (const file of imageFiles) {
      const bitmap = await this.imageProcessing.loadBitmap(file);
      const { dataUrl, width, height } = this.imageProcessing.resizeToDataUrl(bitmap);
      bitmap.close();

      const frame: Frame = {
        id: crypto.randomUUID(),
        name: file.name,
        thumbnailUrl: dataUrl,
        fullResUrl: URL.createObjectURL(file),
        width,
        height,
      };
      this.frames.update((current) => [...current, frame]);
    }
    this.schedulePersist();
  }

  reorder(previousIndex: number, currentIndex: number): void {
    if (previousIndex === currentIndex) return;
    this.frames.update((current) => {
      const next = [...current];
      const [moved] = next.splice(previousIndex, 1);
      next.splice(currentIndex, 0, moved);
      return next;
    });
    this.schedulePersist();
  }

  remove(id: string): void {
    this.frames.update((current) => {
      const target = current.find((frame) => frame.id === id);
      if (target?.fullResUrl) {
        URL.revokeObjectURL(target.fullResUrl);
      }
      return current.filter((frame) => frame.id !== id);
    });
    this.schedulePersist();
  }

  setDelay(ms: number): void {
    this.delayMs.set(Math.max(50, Math.round(ms)));
    this.schedulePersist();
  }

  clear(): void {
    for (const frame of this.frames()) {
      if (frame.fullResUrl) {
        URL.revokeObjectURL(frame.fullResUrl);
      }
    }
    this.frames.set([]);
    this.delayMs.set(DEFAULT_DELAY_MS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  private schedulePersist(): void {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => this.persist(), PERSIST_DEBOUNCE_MS);
  }

  private persist(): void {
    const stored: StoredFrame[] = this.frames().map(({ id, name, thumbnailUrl }) => ({
      id,
      name,
      thumbnailUrl,
    }));
    const state: Pick<TimelineState, 'frames' | 'delayMs'> = {
      frames: stored,
      delayMs: this.delayMs(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* quota exceeded or storage disabled — timeline still works in-memory */
    }
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const state = JSON.parse(raw) as Pick<TimelineState, 'frames' | 'delayMs'>;
      const frames: Frame[] = (state.frames ?? []).map((stored) => ({
        id: stored.id,
        name: stored.name,
        thumbnailUrl: stored.thumbnailUrl,
        fullResUrl: null,
        width: 0,
        height: 0,
      }));
      this.frames.set(frames);
      if (state.delayMs) this.delayMs.set(state.delayMs);
    } catch {
      /* corrupted/unavailable storage — start with an empty timeline */
    }
  }
}
