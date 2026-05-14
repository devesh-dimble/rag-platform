import ollama
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue
from models import SourceChunk

QDRANT_URL = "http://localhost:6333"
COLLECTION_NAME = "rag_chunks"
EMBED_MODEL = "jina/jina-embeddings-v2-base-de"
CHAT_MODEL = "llama3.2"
TOP_K = 5

client = QdrantClient(url=QDRANT_URL)

SYSTEM_PROMPT = (
    "You are a helpful assistant. Answer using only the retrieved context passages below. "
    "The document text may be in a different language than the user's question — "
    "read the passages carefully and answer in the same language as the question. "
    "When citing evidence, use [Source N] where N matches the source numbers provided."
)


def query_rag(question: str, document_id: str) -> tuple[str, list[SourceChunk]]:
    # 1. Embed the question
    embed_response = ollama.embed(model=EMBED_MODEL, input=question)
    query_vector = embed_response["embeddings"][0]

    # 2. Search Qdrant, filtered to this document
    results = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        limit=TOP_K,
        score_threshold=0.2,
        query_filter=Filter(
            must=[
                FieldCondition(
                    key="document_id",
                    match=MatchValue(value=document_id),
                )
            ]
        ),
        with_payload=True,
    ).points

    # 3. Build sources list
    sources = [
        SourceChunk(
            chunk_id=str(result.id),
            text=result.payload["text"],
            page=result.payload["page"],
            bbox=result.payload["bbox"],
        )
        for result in results
    ]

    if not sources:
        return (
            "No retrieved passages were found for this document in the vector store. "
            "Try ingesting again and ensure Qdrant is running with matching document_id.",
            [],
        )

    # 4. Build prompt with retrieved context
    context = "\n\n".join(
        f"[Source {i + 1}, Page {s.page}]\n{s.text}" for i, s in enumerate(sources)
    )
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"Context:\n{context}\n\nQuestion: {question}",
        },
    ]

    # 5. Call Ollama chat
    chat_response = ollama.chat(model=CHAT_MODEL, messages=messages)
    answer = chat_response["message"]["content"]

    return answer, sources
