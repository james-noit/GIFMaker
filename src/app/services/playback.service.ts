import { Injectable, signal } from '@angular/core';
import { FrameStoreService } from './frame-store.service';

@Injectable({ providedIn: 'root' })
export class PlaybackService {
  readonly isPlaying = signal(false);
  readonly activeIndex = signal(0);

  private timerId: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly frameStore: FrameStoreService) {}

  toggle(): void {
    this.isPlaying() ? this.stop() : this.start();
  }

  start(): void {
    if (this.frameStore.frames().length === 0) return;
    this.isPlaying.set(true);
    this.activeIndex.set(0);
    this.scheduleNext();
  }

  stop(): void {
    this.isPlaying.set(false);
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private scheduleNext(): void {
    if (this.timerId) clearTimeout(this.timerId);
    this.timerId = setTimeout(() => {
      const total = this.frameStore.frames().length;
      if (total === 0 || !this.isPlaying()) {
        this.stop();
        return;
      }
      this.activeIndex.update((index) => (index + 1) % total);
      this.scheduleNext();
    }, this.frameStore.delayMs());
  }
}
