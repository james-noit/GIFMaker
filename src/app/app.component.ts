import { Component } from '@angular/core';
import { HeaderComponent } from './components/header/header.component';
import { ImageLoaderComponent } from './components/image-loader/image-loader.component';
import { TimelineComponent } from './components/timeline/timeline.component';

@Component({
  selector: 'app-root',
  imports: [HeaderComponent, ImageLoaderComponent, TimelineComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {}
