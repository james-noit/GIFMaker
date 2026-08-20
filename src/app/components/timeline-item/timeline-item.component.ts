import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Frame } from '../../models/frame.model';

@Component({
  selector: 'app-timeline-item',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="item" [class.item--active]="active()">
      <img class="item__thumb" [src]="frame().thumbnailUrl" [alt]="frame().name" draggable="false" />
      @if (!frame().fullResUrl) {
        <span class="item__badge" title="Restored from a previous session — re-upload for full quality export">
          ⟳
        </span>
      }
      <button
        type="button"
        class="item__remove"
        aria-label="Remove photo"
        (click)="remove.emit(frame().id)"
      >
        ×
      </button>
      <span class="item__index">{{ index() + 1 }}</span>
    </figure>
  `,
  styles: `
    .item {
      position: relative;
      flex: 0 0 auto;
      width: 84px;
      height: 84px;
      margin: 0;
      border-radius: var(--radius-md);
      overflow: hidden;
      border: 2px solid var(--color-border);
      background: var(--color-surface);
      cursor: grab;
      transition:
        transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1),
        border-color 0.18s ease,
        box-shadow 0.18s ease;
    }

    .item:active {
      cursor: grabbing;
    }

    .item:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 14px -8px rgb(0 0 0 / 0.35);
    }

    .item--active {
      border-color: var(--color-accent);
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-accent) 45%, transparent);
    }

    .item__thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
      pointer-events: none;
    }

    .item__remove {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 20px;
      height: 20px;
      line-height: 18px;
      border-radius: 50%;
      border: none;
      background: rgb(0 0 0 / 0.55);
      color: #fff;
      font-size: 0.85rem;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.15s ease, transform 0.15s ease;
    }

    .item:hover .item__remove,
    .item:focus-within .item__remove {
      opacity: 1;
    }

    .item__remove:hover {
      transform: scale(1.1);
    }

    .item__badge {
      position: absolute;
      bottom: 2px;
      left: 2px;
      font-size: 0.7rem;
      padding: 0 4px;
      border-radius: 4px;
      background: rgb(0 0 0 / 0.55);
      color: #fff;
    }

    .item__index {
      position: absolute;
      bottom: 2px;
      right: 4px;
      font-size: 0.65rem;
      color: #fff;
      text-shadow: 0 1px 2px rgb(0 0 0 / 0.6);
    }

    @media (prefers-reduced-motion: reduce) {
      .item {
        transition: none;
      }
    }
  `,
})
export class TimelineItemComponent {
  readonly frame = input.required<Frame>();
  readonly index = input.required<number>();
  readonly active = input(false);
  readonly remove = output<string>();
}
