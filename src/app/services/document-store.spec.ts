import { TestBed } from '@angular/core/testing';

import { DocumentStore } from './document-store';

describe('DocumentStore', () => {
  let service: DocumentStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DocumentStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
