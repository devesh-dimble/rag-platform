import { Injectable, signal } from '@angular/core';

export interface BBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface SourceChunk {
  chunk_id: string;
  text: string;
  page: number;
  bbox: number[];
}

@Injectable({ providedIn: 'root' })
export class DocumentStoreService {
  documentId = signal<string | null>(null);
  pdfBytes = signal<Uint8Array | null>(null);
  activePage = signal<number>(1);
  activeHighlights = signal<number[][]>([]);
  retrievedChunks = signal<SourceChunk[]>([]);

  setDocument(id: string, bytes: Uint8Array) {
    this.documentId.set(id);
    this.pdfBytes.set(bytes);
    this.activePage.set(1);
    this.activeHighlights.set([]);
    this.retrievedChunks.set([]);
  }

  activateSource(chunk: SourceChunk) {
    this.activePage.set(chunk.page);
    this.activeHighlights.set([chunk.bbox]);
  }
}