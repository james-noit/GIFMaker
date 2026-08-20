export interface Frame {
  /** Stable identifier, used for drag/drop tracking and animations. */
  id: string;
  /** Original file name, shown as a11y label / tooltip. */
  name: string;
  /** Small resized JPEG data URL — safe to keep in localStorage. */
  thumbnailUrl: string;
  /**
   * Object URL of the original, full-resolution file. Lives only in memory
   * for the current session (never persisted) so GIF export stays sharp
   * without blowing up localStorage with multi-megabyte data URLs.
   */
  fullResUrl: string | null;
  width: number;
  height: number;
}

export interface StoredFrame {
  id: string;
  name: string;
  thumbnailUrl: string;
}

export interface TimelineState {
  frames: StoredFrame[];
  delayMs: number;
  theme: 'light' | 'dark';
}
