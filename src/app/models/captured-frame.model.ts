export interface CapturedFrame {
  id: string;
  /** Medium-quality JPEG data URL, capped in size — good enough for GIF export. */
  dataUrl: string;
  /** Small JPEG data URL for the filmstrip / persisted storage. */
  thumbUrl: string;
  width: number;
  height: number;
  /** Milliseconds since recording started. */
  t: number;
}
