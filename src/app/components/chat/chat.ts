import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { DocumentStoreService, SourceChunk } from '../../services/document-store';

interface QueryResponse {
  answer: string;
  sources: SourceChunk[];
}

@Component({
  selector: 'app-chat',
  imports: [FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComponent {
  private http = inject(HttpClient);
  store = inject(DocumentStoreService);

  question = '';
  readonly answer = signal('');
  readonly sources = signal<SourceChunk[]>([]);
  readonly loading = signal(false);
  readonly activeChunkId = signal<string | null>(null);

  ask() {
    const docId = this.store.documentId();
    if (!this.question.trim() || !docId) return;

    this.loading.set(true);
    this.answer.set('');
    this.sources.set([]);
    this.activeChunkId.set(null);

    this.http.post<QueryResponse>('http://localhost:8000/query', {
      question: this.question,
      document_id: docId,
    }).subscribe({
      next: (res) => {
        this.answer.set(res.answer);
        this.sources.set(res.sources);
        this.store.retrievedChunks.set(res.sources);
        this.loading.set(false);
      },
      error: () => {
        this.answer.set('Error contacting the server.');
        this.loading.set(false);
      },
    });
  }

  activateSource(chunk: SourceChunk, index: number) {
    this.activeChunkId.set(chunk.chunk_id);
    this.store.activateSource(chunk);
  }
}
