import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="spinner" [style.--size.px]="size()" role="status" [attr.aria-label]="label()">
      <div class="spinner__ring"></div>
      @if (label()) {
        <span class="spinner__label">{{ label() }}</span>
      }
    </div>
  `,
  styles: `
    .spinner {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
    }

    .spinner__ring {
      width: var(--size, 40px);
      height: var(--size, 40px);
      border-radius: 50%;
      border: 3px solid color-mix(in srgb, var(--color-accent) 25%, transparent);
      border-top-color: var(--color-accent);
      animation: spin 0.85s cubic-bezier(0.5, 0, 0.5, 1) infinite;
      will-change: transform;
    }

    .spinner__label {
      font-size: 0.85rem;
      color: var(--color-text-muted);
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .spinner__ring {
        animation-duration: 2s;
      }
    }
  `,
})
export class SpinnerComponent {
  readonly size = input(40);
  readonly label = input<string>('');
}
