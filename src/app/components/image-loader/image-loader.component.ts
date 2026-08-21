import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FrameStoreService } from '../../services/frame-store.service';
import { PlaybackService } from '../../services/playback.service';
import { SpinnerComponent } from '../spinner/spinner.component';

@Component({
  selector: 'app-image-loader',
  imports: [SpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './image-loader.component.html',
  styleUrl: './image-loader.component.scss',
})
export class ImageLoaderComponent {
  readonly isDraggingOver = signal(false);
  readonly isProcessing = signal(false);

  readonly activeFrame = computed(() => {
    const frames = this.frameStore.frames();
    if (frames.length === 0) return null;
    const index = this.playback.activeIndex() % frames.length;
    return frames[index];
  });

  constructor(
    readonly frameStore: FrameStoreService,
    readonly playback: PlaybackService,
  ) {}

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDraggingOver.set(true);
  }

  onDragLeave(): void {
    this.isDraggingOver.set(false);
  }

  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.isDraggingOver.set(false);
    const files = event.dataTransfer?.files;
    if (files?.length) {
      await this.ingest(files);
    }
  }

  async onFileInput(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      await this.ingest(input.files);
    }
    input.value = '';
  }

  private async ingest(files: FileList): Promise<void> {
    this.isProcessing.set(true);
    try {
      await this.frameStore.addFiles(files);
    } finally {
      this.isProcessing.set(false);
    }
  }
}
