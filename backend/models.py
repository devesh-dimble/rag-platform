from pydantic import BaseModel

class Block(BaseModel):
    type: str
    page: int
    bbox: list[float]   # [x0, y0, x1, y1] in PDF user space
    text: str

class SourceChunk(BaseModel):
    chunk_id: str
    text: str
    page: int
    bbox: list[float]

class QueryRequest(BaseModel):
    question: str
    document_id: str

class QueryResponse(BaseModel):
    answer: str
    sources: list[SourceChunk]