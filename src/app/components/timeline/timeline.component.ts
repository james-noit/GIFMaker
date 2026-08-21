import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { Frame } from '../../models/frame.model';
import { FrameStoreService } from '../../services/frame-store.service';
import { PlaybackService } from '../../services/playback.service';
import { TimelineItemComponent } from '../timeline-item/timeline-item.component';

@Component({
  selector: 'app-timeline',
  imports: [CdkDropList, CdkDrag, FormsModule, TimelineItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './timeline.component.html',
  styleUrl: './timeline.component.scss',
})
export class TimelineComponent {
  constructor(
    readonly frameStore: FrameStoreService,
    readonly playback: PlaybackService,
  ) {}

  trackById(_index: number, frame: Frame): string {
    return frame.id;
  }

  onDrop(event: CdkDragDrop<Frame[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    this.frameStore.reorder(event.previousIndex, event.currentIndex);
  }

  onDelayInput(value: string): void {
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds > 0) {
      this.frameStore.setDelay(seconds * 1000);
    }
  }

  remove(id: string): void {
    this.frameStore.remove(id);
  }
}
