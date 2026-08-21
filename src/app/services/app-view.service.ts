import { Injectable, signal } from '@angular/core';

export type AppView = 'basic' | 'studio';

@Injectable({ providedIn: 'root' })
export class AppViewService {
  readonly view = signal<AppView>('basic');

  toggle(): void {
    this.view.set(this.view() === 'basic' ? 'studio' : 'basic');
  }

  show(view: AppView): void {
    this.view.set(view);
  }
}
