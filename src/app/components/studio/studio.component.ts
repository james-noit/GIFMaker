import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CapturedFrame } from '../../models/captured-frame.model';
import { Frame } from '../../models/frame.model';
import { AppViewService } from '../../services/app-view.service';
import { FrameStoreService } from '../../services/frame-store.service';
import { GifExportService } from '../../services/gif-export.service';
import { ScreenRecorderService } from '../../services/screen-recorder.service';
import { IconComponent } from '../icon/icon.component';
import { RatingDotComponent } from '../rating-dot/rating-dot.component';
import { SpinnerComponent } from '../spinner/spinner.component';

const DEFAULT_DELAY_MS = 333;
/** Cap each edge so a crop can never eat the whole frame. */
const MAX_CROP_PERCENT = 40;

@Component({
  selector: 'app-studio',
  imports: [FormsModule, SpinnerComponent, DecimalPipe, IconComponent, RatingDotComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './studio.component.html',
  styleUrl: './studio.component.scss',
})
export class StudioComponent {
  private readonly previewVideo = viewChild<ElementRef<HTMLVideoElement>>('previewVideo');

  readonly settingsOpen = signal(true);

  readonly trimStart = signal(0);
  readonly trimEnd = signal(0);

  readonly cropOpen = signal(false);
  readonly cropTop = signal(0);
  readonly cropBottom = signal(0);
  readonly cropLeft = signal(0);
  readonly cropRight = signal(0);

  /** Playback delay for the exported GIF — starts at the captured cadence, tweakable afterward. */
  readonly delayMs = signal(DEFAULT_DELAY_MS);

  readonly isExporting = signal(false);
  readonly exportProgress = signal(0);
  readonly exportError = signal<string | null>(null);

  readonly isPreviewPlaying = signal(false);
  readonly previewIndex = signal(0);

  readonly trimmedFrames = computed(() => {
    const frames = this.recorder.frames();
    return frames.slice(this.trimStart(), this.trimEnd() + 1);
  });

  readonly trimmedDurationLabel = computed(() => {
    const frames = this.trimmedFrames();
    if (frames.length < 2) return '0.0s';
    const seconds = (frames[frames.length - 1].t - frames[0].t) / 1000;
    return `${seconds.toFixed(1)}s`;
  });

  readonly previewFrame = computed(() => {
    const frames = this.trimmedFrames();
    if (frames.length === 0) return null;
    return frames[this.previewIndex() % frames.length];
  });

  readonly hasCrop = computed(
    () => this.cropTop() > 0 || this.cropBottom() > 0 || this.cropLeft() > 0 || this.cropRight() > 0,
  );

  readonly selectedFpsOption = computed(() =>
    this.recorder.fpsOptions.find((option) => option.fps === this.recorder.fps()),
  );

  readonly selectedResolutionOption = computed(() =>
    this.recorder.resolutionOptions.find((option) => option.maxDimension === this.recorder.maxDimension()),
  );

  readonly estimatedMaxDurationSeconds = computed(() => Math.round(this.recorder.estimatedMaxDurationMs() / 1000));

  readonly estimatedRecordingLabel = computed(
    () => `Up to ${this.recorder.maxFrames()} frames · about ${this.estimatedMaxDurationSeconds()}s`,
  );

  private wasRecording = false;
  private previewTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    readonly recorder: ScreenRecorderService,
    readonly appView: AppViewService,
    private readonly frameStore: FrameStoreService,
    private readonly gifExport: GifExportService,
  ) {
    effect(() => {
      const recording = this.recorder.isRecording();
      const frames = this.recorder.frames();
      if (this.wasRecording && !recording && frames.length > 0) {
        this.trimStart.set(0);
        this.trimEnd.set(frames.length - 1);
        this.delayMs.set(this.recorder.recordedIntervalMs());
        this.resetCrop();
        // Collapse settings once there's something to edit, to leave room for the trim editor.
        this.settingsOpen.set(false);
      }
      this.wasRecording = recording;
    });
  }

  toggleSettings(): void {
    this.settingsOpen.update((open) => !open);
  }

  toggleCrop(): void {
    this.cropOpen.update((open) => !open);
  }

  async startRecording(): Promise<void> {
    const videoEl = this.previewVideo()?.nativeElement;
    if (!videoEl) return;
    this.exportError.set(null);
    this.stopPreview();
    await this.recorder.start(videoEl);
  }

  stopRecording(): void {
    this.recorder.stop();
  }

  discard(): void {
    this.stopPreview();
    this.recorder.reset();
    this.trimStart.set(0);
    this.trimEnd.set(0);
    this.exportError.set(null);
    this.settingsOpen.set(true);
    this.resetCrop();
  }

  async addToTimeline(): Promise<void> {
    this.stopPreview();
    const frames = await this.cropFrames(this.trimmedFrames());
    this.frameStore.addCapturedFrames(frames);
    this.recorder.reset();
    this.trimStart.set(0);
    this.trimEnd.set(0);
    this.resetCrop();
    this.appView.show('basic');
  }

  async exportGif(): Promise<void> {
    if (this.isExporting()) return;
    if (this.trimmedFrames().length === 0) return;

    this.stopPreview();
    this.isExporting.set(true);
    this.exportProgress.set(0);
    this.exportError.set(null);
    try {
      const cropped = await this.cropFrames(this.trimmedFrames());
      const blob = await this.gifExport.build(this.toExportFrames(cropped), this.delayMs(), ({ fraction }) =>
        this.exportProgress.set(fraction),
      );
      this.gifExport.downloadBlob(blob, 'studio-recording.gif');
    } catch (err) {
      console.error('Studio GIF export failed', err);
      this.exportError.set('GIF export failed. Try trimming to fewer frames and retry.');
    } finally {
      this.isExporting.set(false);
    }
  }

  togglePreview(): void {
    this.isPreviewPlaying() ? this.stopPreview() : this.startPreview();
  }

  private startPreview(): void {
    if (this.trimmedFrames().length === 0) return;
    this.isPreviewPlaying.set(true);
    this.previewIndex.set(0);
    this.schedulePreviewFrame();
  }

  private stopPreview(): void {
    this.isPreviewPlaying.set(false);
    if (this.previewTimer) {
      clearTimeout(this.previewTimer);
      this.previewTimer = null;
    }
  }

  private schedulePreviewFrame(): void {
    if (this.previewTimer) clearTimeout(this.previewTimer);
    this.previewTimer = setTimeout(() => {
      const total = this.trimmedFrames().length;
      if (total === 0 || !this.isPreviewPlaying()) {
        this.stopPreview();
        return;
      }
      this.previewIndex.update((index) => (index + 1) % total);
      this.schedulePreviewFrame();
    }, this.delayMs());
  }

  onStartChange(value: number): void {
    this.trimStart.set(Math.min(Number(value), this.trimEnd()));
    this.stopPreview();
  }

  onEndChange(value: number): void {
    this.trimEnd.set(Math.max(Number(value), this.trimStart()));
    this.stopPreview();
  }

  onFpsChange(value: number): void {
    this.recorder.fps.set(Number(value));
  }

  onResolutionChange(value: number): void {
    this.recorder.maxDimension.set(Number(value));
  }

  onUncapChange(value: boolean): void {
    this.recorder.uncapped.set(Boolean(value));
  }

  onDelayInput(seconds: number): void {
    const ms = Number(seconds) * 1000;
    if (Number.isFinite(ms) && ms > 0) {
      this.delayMs.set(Math.max(50, Math.round(ms)));
    }
  }

  onCropTopChange(value: number): void {
    this.cropTop.set(this.clampCrop(Number(value), this.cropBottom()));
  }

  onCropBottomChange(value: number): void {
    this.cropBottom.set(this.clampCrop(Number(value), this.cropTop()));
  }

  onCropLeftChange(value: number): void {
    this.cropLeft.set(this.clampCrop(Number(value), this.cropRight()));
  }

  onCropRightChange(value: number): void {
    this.cropRight.set(this.clampCrop(Number(value), this.cropLeft()));
  }

  resetCrop(): void {
    this.cropTop.set(0);
    this.cropBottom.set(0);
    this.cropLeft.set(0);
    this.cropRight.set(0);
  }

  private clampCrop(value: number, opposite: number): number {
    if (!Number.isFinite(value)) return 0;
    // Leave at least 20% of the frame visible along this axis.
    const max = Math.min(MAX_CROP_PERCENT, 80 - opposite);
    return Math.min(Math.max(0, Math.round(value)), Math.max(0, max));
  }

  isExcluded(index: number): boolean {
    return index < this.trimStart() || index > this.trimEnd();
  }

  formatMs(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  private toExportFrames(frames: CapturedFrame[]): Frame[] {
    return frames.map((frame, index) => ({
      id: frame.id,
      name: `studio-frame-${index + 1}.jpg`,
      thumbnailUrl: frame.thumbUrl,
      fullResUrl: frame.dataUrl,
      width: frame.width,
      height: frame.height,
    }));
  }

  /** Applies the current crop rectangle to a batch of frames, producing new cropped copies.
   *  Leaves the originals untouched — cropping only happens when frames actually leave Studio
   *  (export or send to Basic), not on every slider drag. */
  private async cropFrames(frames: CapturedFrame[]): Promise<CapturedFrame[]> {
    if (!this.hasCrop()) return frames;
    return Promise.all(frames.map((frame) => this.cropFrame(frame)));
  }

  private async cropFrame(frame: CapturedFrame): Promise<CapturedFrame> {
    const top = this.cropTop() / 100;
    const bottom = this.cropBottom() / 100;
    const left = this.cropLeft() / 100;
    const right = this.cropRight() / 100;

    const [full, thumb] = await Promise.all([
      this.cropDataUrl(frame.dataUrl, left, top, right, bottom, 0.85),
      this.cropDataUrl(frame.thumbUrl, left, top, right, bottom, 0.75),
    ]);

    return {
      ...frame,
      dataUrl: full.dataUrl,
      thumbUrl: thumb.dataUrl,
      width: full.width,
      height: full.height,
    };
  }

  private cropDataUrl(
    src: string,
    left: number,
    top: number,
    right: number,
    bottom: number,
    quality: number,
  ): Promise<{ dataUrl: string; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const sx = Math.round(img.naturalWidth * left);
        const sy = Math.round(img.naturalHeight * top);
        const sw = Math.max(1, Math.round(img.naturalWidth * (1 - left - right)));
        const sh = Math.max(1, Math.round(img.naturalHeight * (1 - top - bottom)));

        const canvas = document.createElement('canvas');
        canvas.width = sw;
        canvas.height = sh;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) {
          reject(new Error('Canvas 2D context unavailable'));
          return;
        }
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        resolve({ dataUrl: canvas.toDataURL('image/jpeg', quality), width: sw, height: sh });
      };
      img.onerror = () => reject(new Error('Failed to load frame for cropping'));
      img.src = src;
    });
  }
}
