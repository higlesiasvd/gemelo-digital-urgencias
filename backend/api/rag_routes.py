"""
============================================================================
RAG ROUTES - API endpoints para consultas médicas con RAG
============================================================================
"""

import logging
from typing import Optional, List, Any
from pydantic import BaseModel

from fastapi import APIRouter, HTTPException, Depends

from .rag_service import rag_service
from .auth_routes import require_auth, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rag", tags=["RAG - Asistente Médico"])


# ============================================================================
# MODELOS
# ============================================================================

class QueryRequest(BaseModel):
    question: str
    context_docs: int = 3

class SourceInfo(BaseModel):
    title: str
    authors: str
    edition: str
    pages: str

class QueryResponse(BaseModel):
    answer: str
    sources: List[SourceInfo]
    excerpts: List[str]

class TopicInfo(BaseModel):
    topic: str
    documents: List[str]
    sources: List[str]


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/query")
async def query_medical_knowledge(
    request: QueryRequest,
    user: dict = Depends(get_current_user)
):
    """
    Consulta la base de conocimientos médica con fuentes bibliográficas.
    """
    if not request.question or len(request.question.strip()) < 3:
        raise HTTPException(status_code=400, detail="La pregunta debe tener al menos 3 caracteres")
    
    try:
        result = await rag_service.query_with_llm(
            question=request.question,
            context_docs=min(request.context_docs, 5)
        )
        
        return {
            "answer": result["answer"],
            "sources": result.get("sources", []),
            "excerpts": result.get("excerpts", [])
        }
        
    except Exception as e:
        logger.error(f"Error en consulta RAG: {e}")
        raise HTTPException(status_code=500, detail="Error al procesar la consulta médica")


@router.get("/topics")
async def get_available_topics():
    """
    Obtiene los temas disponibles con sus fuentes bibliográficas.
    """
    return rag_service.get_topics()


@router.post("/search")
async def search_documents(query: str, limit: int = 5):
    """
    Busca documentos relevantes con información de fuentes.
    """
    results = rag_service.search(query, n_results=min(limit, 10))
    
    return {
        "query": query,
        "results": [
            {
                "title": doc["title"],
                "topic": doc["topic"],
                "source": doc["source"],
                "excerpt": doc.get("excerpt", ""),
                "preview": doc["content"][:400] + "..." if len(doc["content"]) > 400 else doc["content"]
            }
            for doc in results
        ]
    }


@router.get("/health")
async def rag_health_check():
    """Verifica el estado del servicio RAG."""
    topics = rag_service.get_topics()
    return {
        "status": "healthy",
        "topics_count": len(topics),
        "documents_count": sum(len(t["documents"]) for t in topics)
    }
