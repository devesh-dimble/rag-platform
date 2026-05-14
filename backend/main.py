import json
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import QueryRequest, QueryResponse, SourceChunk
from ingest import ingest_blocks
from query import query_rag

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/ingest")
async def ingest(
    pdf: UploadFile = File(...),
    layout: UploadFile = File(...),
):
    if not layout.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="layout must be a JSON file")

    content = await layout.read()
    data = json.loads(content)

    document_id = data.get("pdf_path", pdf.filename)
    blocks = data.get("blocks", [])

    if not blocks:
        raise HTTPException(status_code=400, detail="No blocks found in JSON")

    count = ingest_blocks(document_id=document_id, blocks=blocks)
    return {"document_id": document_id, "ingested": count}


@app.post("/query", response_model=QueryResponse)
async def query(body: QueryRequest):
    answer, sources = query_rag(
        question=body.question,
        document_id=body.document_id,
    )
    return QueryResponse(answer=answer, sources=sources)