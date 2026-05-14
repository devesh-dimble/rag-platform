import { Component, inject, effect, ElementRef, ViewChild, signal } from '@angular/core';
import { DocumentStoreService } from '../../services/document-store';

@Component({
  selector: 'app-pdf-viewer',
  standalone: true,
  templateUrl: './pdf-viewer.html',
  styleUrl: './pdf-viewer.scss',
})
export class PdfViewerComponent {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('overlay') overlayRef!: ElementRef<HTMLDivElement>;

  store = inject(DocumentStoreService);

  private pdfjsLib: any = null;
  private pdfDoc: any = null;
  scale = 1.5;
  readonly totalPages = signal(0);

  constructor() {
    effect(() => {
      const bytes = this.store.pdfBytes();
      if (bytes) this.loadPdf(bytes);
    });

    effect(() => {
      const page = this.store.activePage();
      if (this.pdfDoc) this.renderPage(page);
    });

    effect(() => {
      const highlights = this.store.activeHighlights();
      this.drawHighlights(highlights);
    });
  }

  private async getPdfjs() {
    if (!this.pdfjsLib) {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      this.pdfjsLib = pdfjs;
    }
    return this.pdfjsLib;
  }

  private async loadPdf(bytes: Uint8Array) {
    const pdfjs = await this.getPdfjs();
    this.pdfDoc = await pdfjs.getDocument({ data: bytes }).promise;
    this.totalPages.set(this.pdfDoc.numPages);
    this.renderPage(this.store.activePage());
  }

  async renderPage(pageNum: number) {
    if (!this.pdfDoc) return;
    const page = await this.pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: this.scale });

    const canvas = this.canvasRef.nativeElement;
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: canvas.getContext('2d')!,
      viewport,
    }).promise;

    // Resize overlay to match canvas
    const overlay = this.overlayRef.nativeElement;
    overlay.style.width = `${viewport.width}px`;
    overlay.style.height = `${viewport.height}px`;

    this.drawHighlights(this.store.activeHighlights());
  }

  private drawHighlights(highlights: number[][]) {
    const overlay = this.overlayRef?.nativeElement;
    if (!overlay) return;
    overlay.innerHTML = '';

    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    for (const bbox of highlights) {
      const [x0, y0, x1, y1] = bbox;

      // Layout JSON coords are top-origin; map directly to canvas space.
      const top = y0 * this.scale;
      const left = x0 * this.scale;
      const width = (x1 - x0) * this.scale;
      const height = (y1 - y0) * this.scale;

      const div = document.createElement('div');
      div.style.position = 'absolute';
      div.style.top = `${top}px`;
      div.style.left = `${left}px`;
      div.style.width = `${width}px`;
      div.style.height = `${height}px`;
      div.style.background = 'rgba(255, 255, 0, 0.45)';
      div.style.pointerEvents = 'none';
      overlay.appendChild(div);
    }
  }

  prevPage() {
    const p = this.store.activePage();
    if (p > 1) this.store.activePage.set(p - 1);
  }

  nextPage() {
    const p = this.store.activePage();
    if (this.pdfDoc && p < this.totalPages()) this.store.activePage.set(p + 1);
  }
}