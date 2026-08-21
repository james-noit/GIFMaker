import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { version } from '../../../../package.json';
import { AppViewService } from '../../services/app-view.service';
import { FrameStoreService } from '../../services/frame-store.service';
import { GifExportService } from '../../services/gif-export.service';
import { ThemeService } from '../../services/theme.service';
import { IconComponent } from '../icon/icon.component';
import { SpinnerComponent } from '../spinner/spinner.component';

@Component({
  selector: 'app-header',
  imports: [SpinnerComponent, DecimalPipe, NgTemplateOutlet, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  readonly appVersion = version;
  readonly isMenuOpen = signal(false);
  readonly isExporting = signal(false);
  readonly exportProgress = signal(0);

  constructor(
    readonly theme: ThemeService,
    readonly frameStore: FrameStoreService,
    readonly appView: AppViewService,
    private readonly gifExport: GifExportService,
  ) {}

  toggleMenu(): void {
    this.isMenuOpen.update((open) => !open);
  }

  toggleView(): void {
    this.appView.toggle();
    this.closeMenu();
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  async exportGif(): Promise<void> {
    if (this.isExporting() || this.frameStore.count() === 0) return;
    this.isExporting.set(true);
    this.exportProgress.set(0);
    try {
      const blob = await this.gifExport.build(
        this.frameStore.frames(),
        this.frameStore.delayMs(),
        ({ fraction }) => this.exportProgress.set(fraction),
      );
      this.gifExport.downloadBlob(blob);
    } catch (err) {
      console.error('GIF export failed', err);
    } finally {
      this.isExporting.set(false);
      this.closeMenu();
    }
  }

  clearAndReset(): void {
    this.frameStore.clear();
    this.closeMenu();
  }
}
