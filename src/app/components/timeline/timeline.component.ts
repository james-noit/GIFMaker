import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  afterNextRender,
  effect,
  signal,
  viewChild,
} from '@angular/core';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { FormsModule } from '@angular/forms';
import { Frame } from '../../models/frame.model';
import { FrameStoreService } from '../../services/frame-store.service';
import { PlaybackService } from '../../services/playback.service';
import { IconComponent } from '../icon/icon.component';
import { TimelineItemComponent } from '../timeline-item/timeline-item.component';

@Component({
  selector: 'app-timeline',
  imports: [CdkDropList, CdkDrag, FormsModule, TimelineItemComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './timeline.component.html',
  styleUrl: './timeline.component.scss',
})
export class TimelineComponent {
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  readonly canScrollLeft = signal(false);
  readonly canScrollRight = signal(false);

  constructor(
    readonly frameStore: FrameStoreService,
    readonly playback: PlaybackService,
  ) {
    afterNextRender(() => this.updateScrollState());
    effect(() => {
      this.frameStore.frames();
      queueMicrotask(() => this.updateScrollState());
    });
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateScrollState();
  }

  trackById(_index: number, frame: Frame): string {
    return frame.id;
  }

  onDrop(event: CdkDragDrop<Frame[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    this.frameStore.reorder(event.previousIndex, event.currentIndex);
    queueMicrotask(() => this.updateScrollState());
  }

  onDelayInput(value: string): void {
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds > 0) {
      this.frameStore.setDelay(seconds * 1000);
    }
  }

  remove(id: string): void {
    this.frameStore.remove(id);
    queueMicrotask(() => this.updateScrollState());
  }

  scrollByAmount(direction: 1 | -1): void {
    const el = this.scroller()?.nativeElement;
    if (!el) return;
    el.scrollBy({ left: direction * Math.round(el.clientWidth * 0.8), behavior: 'smooth' });
  }

  updateScrollState(): void {
    const el = this.scroller()?.nativeElement;
    if (!el) {
      this.canScrollLeft.set(false);
      this.canScrollRight.set(false);
      return;
    }
    const maxScroll = el.scrollWidth - el.clientWidth;
    const threshold = 16;
    this.canScrollLeft.set(el.scrollLeft > threshold);
    this.canScrollRight.set(el.scrollLeft < maxScroll - threshold);
  }
}
