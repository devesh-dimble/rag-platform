import { Component } from '@angular/core';
import { UploadComponent } from './components/upload/upload';
import { ChatComponent } from './components/chat/chat';
import { PdfViewerComponent } from './components/pdf-viewer/pdf-viewer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [UploadComponent, ChatComponent, PdfViewerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}