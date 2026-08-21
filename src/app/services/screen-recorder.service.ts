import { Injectable, computed, signal } from '@angular/core';
import { CapturedFrame } from '../models/captured-frame.model';

/** Traffic-light rating shown as a colored icon next to a setting. */
export type Rating = 'good' | 'ok' | 'heavy';

export interface FpsOption {
  fps: number;
  label: string;
  hint: string;
  rating: Rating;
}

export interface ResolutionOption {
  maxDimension: number;
  label: string;
  hint: string;
  rating: Rating;
}

/** Hard ceiling on recording length — keeps runaway sessions from filling memory. */
const MAX_DURATION_MS = 120_000;
/** Fastest option we expose — most browsers can't render GIFs any smoother than this anyway. */
const MAX_FPS = 15;
const MIN_FRAME_INTERVAL_MS = Math.round(1000 / MAX_FPS);

export const FPS_OPTIONS: FpsOption[] = [
  { fps: 1, label: '1 fps', hint: 'Choppy — only for very slow, simple motion.', rating: 'good' },
  { fps: 2, label: '2 fps', hint: 'Slightly choppy.', rating: 'good' },
  { fps: 3, label: '3 fps', hint: 'Acceptable, still a bit stepped.', rating: 'good' },
  { fps: 5, label: '5 fps', hint: 'Smooth enough for most GIFs — safe on any device.', rating: 'good' },
  { fps: 8, label: '8 fps', hint: 'Fluid motion, still light on resources.', rating: 'ok' },
  {
    fps: 10,
    label: '10 fps',
    hint: 'Very fluid — most browsers can’t render GIFs smoother than this.',
    rating: 'ok',
  },
  {
    fps: 12,
    label: '12 fps',
    hint: 'Fluid, but heavier to capture — may drop frames on slower devices.',
    rating: 'heavy',
  },
  {
    fps: 15,
    label: '15 fps (max)',
    hint: 'Maximum smoothness — likely to drop frames on slower devices.',
    rating: 'heavy',
  },
];

export const RESOLUTION_OPTIONS: ResolutionOption[] = [
  { maxDimension: 320, label: 'Low (320px)', hint: 'Fastest, lowest memory use.', rating: 'good' },
  { maxDimension: 480, label: 'Medium (480px)', hint: 'Good balance for most devices.', rating: 'good' },
  { maxDimension: 640, label: 'High (640px)', hint: 'Sharper, noticeable performance cost.', rating: 'ok' },
  {
    maxDimension: 960,
    label: 'Very high (960px)',
    hint: 'May slow down recording or export on slower devices.',
    rating: 'ok',
  },
  {
    maxDimension: 1280,
    label: 'Ultra (1280px)',
    hint: 'Very sharp — likely slow or choppy on slower devices.',
    rating: 'heavy',
  },
  {
    maxDimension: 1920,
    label: 'Max (1920px)',
    hint: 'Full detail — heaviest setting, best reserved for fast devices.',
    rating: 'heavy',
  },
];

const DEFAULT_FPS = 5;
const DEFAULT_MAX_DIMENSION = 480;
const FRAME_QUALITY = 0.72;
/** Longest edge for the filmstrip thumbnail — always small, regardless of capture resolution. */
const THUMB_MAX_DIMENSION = 200;
const THUMB_QUALITY = 0.7;

/** The real memory guardrail: higher resolutions cost more per frame, so they get a smaller
 *  frame budget. This trades clip length for detail instead of ever ballooning memory use. */
function maxFramesForResolution(maxDimension: number): number {
  if (maxDimension <= 480) return 150;
  if (maxDimension <= 640) return 130;
  if (maxDimension <= 960) return 100;
  if (maxDimension <= 1280) return 70;
  return 50;
}

/** Rough bytes-per-source-pixel for a base64 JPEG data URL at our capture quality — screen
 *  content (flat regions, text) compresses well, so this is a conservative estimate. */
const BYTES_PER_PIXEL_ESTIMATE = 0.22;
/** Flat estimate for the small filmstrip thumbnail, which stays a fixed size regardless of
 *  capture resolution. */
const THUMB_BYTES_ESTIMATE = 8_000;
/** Assumed capture aspect ratio, only used to turn "longest edge" into an approximate pixel count. */
const ASSUMED_ASPECT_RATIO = 16 / 9;
/** Above this projected footprint for a full-length take, we warn that the combination is heavy. */
const MEMORY_WARNING_BYTES = 25 * 1024 * 1024;

function estimateBytesPerFrame(maxDimension: number): number {
  const height = Math.round(maxDimension / ASSUMED_ASPECT_RATIO);
  return maxDimension * height * BYTES_PER_PIXEL_ESTIMATE + THUMB_BYTES_ESTIMATE;
}

@Injectable({ providedIn: 'root' })
export class ScreenRecorderService {
  readonly isSupported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia;

  readonly fpsOptions = FPS_OPTIONS;
  readonly resolutionOptions = RESOLUTION_OPTIONS;

  /** User-selected capture settings — editable only while not recording. */
  readonly fps = signal(DEFAULT_FPS);
  readonly maxDimension = signal(DEFAULT_MAX_DIMENSION);
  /** Opt-in escape hatch: ignores the resolution-based frame budget so a recording can run the
   *  full 120s even at heavy settings. The 120s ceiling itself always stays in place. */
  readonly uncapped = signal(false);
  readonly captureIntervalMs = computed(() => Math.max(MIN_FRAME_INTERVAL_MS, Math.round(1000 / this.fps())));
  /** Frame budget for the currently selected resolution — shrinks as resolution grows, unless
   *  uncapped, in which case it's sized to allow the full 120s duration. */
  readonly maxFrames = computed(() => {
    if (this.uncapped()) {
      return Math.ceil(MAX_DURATION_MS / this.captureIntervalMs());
    }
    return maxFramesForResolution(this.maxDimension());
  });
  /** How long a recording can run before it hits the frame budget, at the current settings. */
  readonly estimatedMaxDurationMs = computed(() =>
    Math.min(MAX_DURATION_MS, this.maxFrames() * this.captureIntervalMs()),
  );

  /** Projected memory footprint if a recording ran the full 120s at the current fps/resolution —
   *  i.e. before the frame budget above would actually cut it short. Used purely to warn about
   *  heavy combinations; the frame budget is what actually protects memory. */
  readonly projectedFullLengthBytes = computed(() => {
    const framesForFullDuration = Math.ceil(MAX_DURATION_MS / this.captureIntervalMs());
    return framesForFullDuration * estimateBytesPerFrame(this.maxDimension());
  });
  readonly projectedFullLengthMb = computed(() => this.projectedFullLengthBytes() / (1024 * 1024));
  readonly isMemoryHeavy = computed(() => this.projectedFullLengthBytes() > MEMORY_WARNING_BYTES);

  readonly isRecording = signal(false);
  readonly elapsedMs = signal(0);
  readonly frames = signal<CapturedFrame[]>([]);
  readonly error = signal<string | null>(null);

  /** fps/interval actually used for the current (or most recent) recording — frozen at start(). */
  readonly recordedFps = signal(DEFAULT_FPS);
  readonly recordedIntervalMs = signal(Math.round(1000 / DEFAULT_FPS));

  readonly maxDurationMs = MAX_DURATION_MS;
  readonly frameCount = computed(() => this.frames().length);

  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private captureTimer: ReturnType<typeof setInterval> | null = null;
  private elapsedTimer: ReturnType<typeof setInterval> | null = null;
  private startedAt = 0;
  private activeMaxDimension = DEFAULT_MAX_DIMENSION;
  private activeMaxFrames = 150;

  /** Starts capturing the screen into `videoEl` (owned by the component, so it can show a live preview). */
  async start(videoEl: HTMLVideoElement): Promise<void> {
    if (this.isRecording()) return;
    this.error.set(null);
    this.frames.set([]);

    if (!this.isSupported) {
      this.error.set('Screen recording is not supported in this browser.');
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: this.fps() },
        audio: false,
      });
    } catch {
      this.error.set('Screen recording permission was denied or cancelled.');
      return;
    }

    this.stream = stream;
    this.video = videoEl;
    videoEl.srcObject = stream;
    videoEl.muted = true;
    try {
      await videoEl.play();
    } catch {
      /* autoplay quirks — capture loop will simply skip frames until it starts */
    }

    stream.getVideoTracks()[0]?.addEventListener('ended', () => this.stop());

    // Freeze the settings actually used for this take, so mid-recording UI changes can't
    // desync capture from what's reported afterward.
    this.activeMaxDimension = this.maxDimension();
    this.activeMaxFrames = this.maxFrames();
    this.recordedFps.set(this.fps());
    this.recordedIntervalMs.set(this.captureIntervalMs());

    this.startedAt = performance.now();
    this.isRecording.set(true);
    this.elapsedMs.set(0);

    this.captureFrame();
    this.captureTimer = setInterval(() => this.captureFrame(), this.recordedIntervalMs());
    this.elapsedTimer = setInterval(() => {
      const elapsed = performance.now() - this.startedAt;
      this.elapsedMs.set(elapsed);
      if (elapsed >= MAX_DURATION_MS) {
        this.stop();
      }
    }, 200);
  }

  stop(): void {
    if (!this.isRecording()) return;
    this.isRecording.set(false);
    if (this.captureTimer) {
      clearInterval(this.captureTimer);
      this.captureTimer = null;
    }
    if (this.elapsedTimer) {
      clearInterval(this.elapsedTimer);
      this.elapsedTimer = null;
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.video = null;
  }

  /** Clears captured frames and error state, ready for a new recording. */
  reset(): void {
    this.stop();
    this.frames.set([]);
    this.elapsedMs.set(0);
    this.error.set(null);
  }

  private captureFrame(): void {
    const video = this.video;
    if (!video || video.videoWidth === 0) return;
    if (this.frames().length >= this.activeMaxFrames) {
      this.stop();
      return;
    }

    const full = this.drawToDataUrl(video, this.activeMaxDimension, FRAME_QUALITY);
    const thumb = this.drawToDataUrl(video, THUMB_MAX_DIMENSION, THUMB_QUALITY);
    if (!full || !thumb) return;

    const frame: CapturedFrame = {
      id: crypto.randomUUID(),
      dataUrl: full.dataUrl,
      thumbUrl: thumb.dataUrl,
      width: full.width,
      height: full.height,
      t: performance.now() - this.startedAt,
    };
    this.frames.update((current) => [...current, frame]);
  }

  private drawToDataUrl(
    video: HTMLVideoElement,
    maxDimension: number,
    quality: number,
  ): { dataUrl: string; width: number; height: number } | null {
    const scale = Math.min(1, maxDimension / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.max(1, Math.round(video.videoWidth * scale));
    const height = Math.max(1, Math.round(video.videoHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, width, height);
    return { dataUrl: canvas.toDataURL('image/jpeg', quality), width, height };
  }
}
