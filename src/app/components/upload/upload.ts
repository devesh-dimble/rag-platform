import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DocumentStoreService } from '../../services/document-store';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.html',
  styleUrl: './upload.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UploadComponent {
  private http = inject(HttpClient);
  private store = inject(DocumentStoreService);

  pdfFile: File | null = null;
  jsonFile: File | null = null;
  readonly status = signal<'idle' | 'uploading' | 'done' | 'error'>('idle');
  readonly message = signal('');

  onPdfSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.pdfFile = input.files?.[0] ?? null;
  }

  onJsonSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.jsonFile = input.files?.[0] ?? null;
  }

  upload() {
    if (!this.pdfFile || !this.jsonFile) return;

    this.status.set('uploading');
    const form = new FormData();
    form.append('pdf', this.pdfFile);
    form.append('layout', this.jsonFile);

    this.http
      .post<{ document_id: string; ingested: number }>(
        'http://localhost:8000/ingest',
        form,
      )
      .subscribe({
        next: (res) => {
          const reader = new FileReader();
          reader.onload = () => {
            const bytes = new Uint8Array(reader.result as ArrayBuffer);
            this.store.setDocument(res.document_id, bytes);
          };
          reader.readAsArrayBuffer(this.pdfFile!);
          this.status.set('done');
          this.message.set(`Ingested ${res.ingested} chunks`);
        },
        error: () => {
          this.status.set('error');
          this.message.set('Upload failed');
        },
      });
  }
}
