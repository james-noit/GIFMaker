import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Rating } from '../../services/screen-recorder.service';

const COLOR: Record<Rating, string> = {
  good: 'var(--color-success)',
  ok: 'var(--color-warning)',
  heavy: 'var(--color-danger)',
};

const LABEL: Record<Rating, string> = {
  good: 'Good — safe on any device',
  ok: 'Moderate — heavier on slower devices',
  heavy: 'Heavy — may struggle on slower devices',
};

/** A small gauge dot: empty ring (good), half-filled (ok), fully filled (heavy) — a
 *  colored, non-emoji stand-in for a traffic-light rating. */
@Component({
  selector: 'app-rating-dot',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.width]="size()" [attr.height]="size()" viewBox="0 0 16 16" role="img" [attr.aria-label]="label()">
      <circle cx="8" cy="8" r="6.1" fill="none" [attr.stroke]="color()" stroke-width="1.6" />
      @if (rating() === 'ok') {
        <path d="M8 1.9A6.1 6.1 0 018 14.1z" [attr.fill]="color()" />
      }
      @if (rating() === 'heavy') {
        <circle cx="8" cy="8" r="4.2" [attr.fill]="color()" />
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      line-height: 0;
      flex: 0 0 auto;
    }
  `,
})
export class RatingDotComponent {
  readonly rating = input.required<Rating>();
  readonly size = input(14);

  readonly color = computed(() => COLOR[this.rating()]);
  readonly label = computed(() => LABEL[this.rating()]);
}
