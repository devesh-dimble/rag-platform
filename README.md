# RAG platform

Angular frontend for PDF viewing and chat, plus a FastAPI backend that ingests layout-aware text blocks into [Qdrant](https://qdrant.tech/) and answers questions with [Ollama](https://ollama.com/). Clicking a retrieved source highlights the matching region on the PDF.

## Prerequisites

- **Node.js** (LTS) and **npm** — for the Angular app
- **Python 3.11+** — for the backend
- **Docker** (recommended) or a local **Qdrant** install — vector database on port `6333`
- **Ollama** — embeddings and chat; must expose the default API (typically `http://localhost:11434`)

## Models (Ollama)

Pull the models referenced by the backend before ingesting or querying:

```bash
ollama pull jina/jina-embeddings-v2-base-de
ollama pull llama3.2
```

Embedding and chat model names are defined in `backend/ingest.py` and `backend/query.py` if you want to change them.

## Run Qdrant

```bash
docker run -p 6333:6333 qdrant/qdrant
```

The backend expects Qdrant at `http://localhost:6333` (see `backend/ingest.py`).

## Run the backend

From the repository root:

```bash
cd backend
python -m venv venv
```

Activate the virtual environment:

- **Windows:** `venv\Scripts\activate`
- **macOS / Linux:** `source venv/bin/activate`

Then:

```bash
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

- Health check: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
- CORS is configured for the Angular dev server at `http://localhost:4200` (`backend/main.py`).

## Run the frontend

From the repository root:

```bash
npm install
npm start
```

Open [http://localhost:4200](http://localhost:4200). The build copies `pdf.worker.min.mjs` from `pdfjs-dist` so the PDF viewer can load documents in the browser.

## Using the PDF highlighter and RAG flow

1. Start **Qdrant**, **Ollama** (with the models above), the **backend**, then **Angular** (`npm start`).
2. Prepare a **layout JSON** file alongside your PDF. The ingest API expects JSON with:
   - `pdf_path` (optional): used as `document_id` if present; otherwise the uploaded PDF filename is used.
   - `blocks`: array of objects, each with at least:
     - `text` — chunk text for embedding and display
     - `page` — 1-based page number
     - `bbox` — `[x0, y0, x1, y1]` in **PDF layout coordinates** (top-origin); the viewer scales these to match the rendered page.

   Example:

   ```json
   {
     "pdf_path": "my-doc.pdf",
     "blocks": [
       {
         "text": "Sample paragraph text.",
         "page": 1,
         "bbox": [72, 100, 400, 130],
         "type": "paragraph"
       }
     ]
   }
   ```

3. In the app, select the **PDF** and **layout JSON**, then upload. Chunks are embedded and stored in Qdrant scoped by `document_id`.
4. Ask a question in chat. Answers include **sources**; choosing a source jumps to that page and draws a highlight overlay from the chunk’s `bbox`.

If ingestion or query returns no sources, confirm Qdrant is running, Ollama models are pulled, and `document_id` from the ingest response matches the document used for `/query`.

## API overview

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/health` | Liveness |
| `POST` | `/ingest` | Multipart: `pdf` + `layout` (`.json`) |
| `POST` | `/query` | JSON body: `question`, `document_id` |

The Angular app calls `http://localhost:8000` for these endpoints. For production, point the frontend at your deployed API and align CORS in `main.py`.

## Project layout

- `src/` — Angular application (upload, PDF viewer, chat)
- `backend/` — FastAPI app (`main.py`), ingest/query logic, `requirements.txt`

## License
