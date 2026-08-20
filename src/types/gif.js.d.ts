declare module 'gif.js' {
  export interface GIFOptions {
    workers?: number;
    quality?: number;
    width?: number;
    height?: number;
    workerScript?: string;
    background?: string;
    repeat?: number;
  }

  export interface AddFrameOptions {
    delay?: number;
    copy?: boolean;
  }

  export default class GIF {
    constructor(options?: GIFOptions);
    addFrame(
      element: CanvasImageSource | ImageData,
      options?: AddFrameOptions,
    ): void;
    on(event: 'finished', listener: (blob: Blob) => void): void;
    on(event: 'progress', listener: (fraction: number) => void): void;
    on(event: 'abort' | 'start', listener: () => void): void;
    render(): void;
    abort(): void;
  }
}
