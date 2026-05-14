import uuid
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    FilterSelector,
    MatchValue,
    PointStruct,
    VectorParams,
)
import ollama

QDRANT_URL = "http://localhost:6333"
COLLECTION_NAME = "rag_chunks"
EMBED_MODEL = "jina/jina-embeddings-v2-base-de"
VECTOR_SIZE = 768

client = QdrantClient(url=QDRANT_URL)


def ensure_collection():
    existing = [c.name for c in client.get_collections().collections]
    if COLLECTION_NAME in existing:
        info = client.get_collection(COLLECTION_NAME)
        configured = info.config.params.vectors
        dim = configured.size if isinstance(configured, VectorParams) else configured["default"].size
        if dim != VECTOR_SIZE:
            client.delete_collection(COLLECTION_NAME)
            existing = [c.name for c in client.get_collections().collections]
    if COLLECTION_NAME not in existing:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )


def ingest_blocks(document_id: str, blocks: list[dict]) -> int:
    ensure_collection()
    client.delete(
        collection_name=COLLECTION_NAME,
        points_selector=FilterSelector(
            filter=Filter(
                must=[
                    FieldCondition(
                        key="document_id",
                        match=MatchValue(value=document_id),
                    )
                ]
            )
        ),
        wait=True,
    )

    points = []
    for block in blocks:
        text = block.get("text", "").strip()
        if not text:
            continue

        truncated = text[:400]  # mxbai-embed-large: 512-token BERT context limit
        try:
            response = ollama.embed(model=EMBED_MODEL, input=truncated)
        except Exception:
            continue
        vector = response["embeddings"][0]

        point = PointStruct(
            id=str(uuid.uuid4()),
            vector=vector,
            payload={
                "document_id": document_id,
                "page": block["page"],
                "bbox": block["bbox"],
                "text": text,
                "type": block.get("type", ""),
            },
        )
        points.append(point)

    client.upsert(collection_name=COLLECTION_NAME, points=points)
    return len(points)