"""
Middleware de deduplicação de requests.

Adiciona headers informativos sobre requisições em andamento.
"""

from common.cache import request_dedup


async def deduplicate_requests(request, call_next):
    """Adiciona X-Pending-Requests header à resposta."""
    response = await call_next(request)
    pending = request_dedup.get_pending_requests()
    response.headers["X-Pending-Requests"] = str(len(pending))
    return response
