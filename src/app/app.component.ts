import { Component } from '@angular/core';
import { HeaderComponent } from './components/header/header.component';
import { ImageLoaderComponent } from './components/image-loader/image-loader.component';
import { StudioComponent } from './components/studio/studio.component';
import { TimelineComponent } from './components/timeline/timeline.component';
import { AppViewService } from './services/app-view.service';

@Component({
  selector: 'app-root',
  imports: [HeaderComponent, ImageLoaderComponent, TimelineComponent, StudioComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  constructor(readonly appView: AppViewService) {}
}
