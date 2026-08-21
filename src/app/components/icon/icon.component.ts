import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type IconName =
  | 'logo'
  | 'camera'
  | 'image'
  | 'download'
  | 'moon'
  | 'sun'
  | 'trash'
  | 'settings'
  | 'play'
  | 'pause'
  | 'record'
  | 'stop'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'close'
  | 'refresh'
  | 'warning'
  | 'send'
  | 'crop';

/** Small line-icon set (stroke-based, `currentColor`) used everywhere the app used to reach
 *  for an emoji. Filled shapes (play/pause/record/stop) set their own fill locally. */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      @switch (name()) {
        @case ('logo') {
          <rect x="3" y="3" width="18" height="18" rx="4" />
          <path d="M10 8l6 4-6 4z" fill="currentColor" stroke="none" />
        }
        @case ('camera') {
          <path d="M4 8a2 2 0 012-2h1.5l1-1.6h6.6L16 6H18a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8z" />
          <circle cx="12" cy="13" r="3.2" />
        }
        @case ('image') {
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <circle cx="8.5" cy="9.5" r="1.6" fill="currentColor" stroke="none" />
          <path d="M21 16.5l-5.4-5.4a1.5 1.5 0 00-2.1 0L4 20" />
        }
        @case ('download') {
          <path d="M12 3v12" />
          <path d="M7 11l5 5 5-5" />
          <path d="M5 21h14" />
        }
        @case ('moon') {
          <path d="M20 14.5A8.5 8.5 0 1110.5 4a7 7 0 009.5 10.5z" />
        }
        @case ('sun') {
          <circle cx="12" cy="12" r="4" />
          <path
            d="M12 2v2.2M12 19.8V22M4.9 4.9l1.55 1.55M17.55 17.55l1.55 1.55M2 12h2.2M19.8 12H22M4.9 19.1l1.55-1.55M17.55 6.45l1.55-1.55"
          />
        }
        @case ('trash') {
          <path d="M4 7h16" />
          <path d="M9 7V4.5A1.5 1.5 0 0110.5 3h3A1.5 1.5 0 0115 4.5V7" />
          <path d="M6.5 7l.8 12.4A2 2 0 009.3 21h5.4a2 2 0 002-1.6L17.5 7" />
          <path d="M10 11v6M14 11v6" />
        }
        @case ('settings') {
          <path d="M4 6h9M17 6h3" />
          <circle cx="14" cy="6" r="2" fill="currentColor" stroke="none" />
          <path d="M4 12h3M11 12h9" />
          <circle cx="8" cy="12" r="2" fill="currentColor" stroke="none" />
          <path d="M4 18h9M17 18h3" />
          <circle cx="14" cy="18" r="2" fill="currentColor" stroke="none" />
        }
        @case ('play') {
          <path d="M8 5v14l11-7z" fill="currentColor" stroke="none" />
        }
        @case ('pause') {
          <rect x="6" y="5" width="4" height="14" fill="currentColor" stroke="none" />
          <rect x="14" y="5" width="4" height="14" fill="currentColor" stroke="none" />
        }
        @case ('record') {
          <circle cx="12" cy="12" r="7" fill="currentColor" stroke="none" />
        }
        @case ('stop') {
          <rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" stroke="none" />
        }
        @case ('chevron-left') {
          <path d="M15 5l-7 7 7 7" />
        }
        @case ('chevron-right') {
          <path d="M9 5l7 7-7 7" />
        }
        @case ('chevron-down') {
          <path d="M5 9l7 7 7-7" />
        }
        @case ('close') {
          <path d="M6 6l12 12M18 6L6 18" />
        }
        @case ('refresh') {
          <path d="M4 4v5h5" />
          <path d="M20 20v-5h-5" />
          <path d="M5.5 9a7 7 0 0113-3M18.5 15a7 7 0 01-13 3" />
        }
        @case ('warning') {
          <path d="M12 3.2L22 20.8H2z" />
          <path d="M12 9.5v4.5" />
          <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
        }
        @case ('send') {
          <path d="M13 5l7 7-7 7" />
          <path d="M20 12H4" />
        }
        @case ('crop') {
          <path d="M6 2v14a2 2 0 002 2h14" />
          <path d="M18 22V8a2 2 0 00-2-2H2" />
        }
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
export class IconComponent {
  readonly name = input.required<IconName>();
  readonly size = input(18);
}
