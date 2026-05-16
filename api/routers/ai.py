from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import anthropic, json, os

router = APIRouter()
api_key = os.environ.get("ANTHROPIC_API_KEY")
client = anthropic.Anthropic(api_key=api_key) if api_key and api_key != "your_key_here" else None

class ChatRequest(BaseModel):
    messages: list
    context: dict = {}
    model: str = "claude-sonnet-4-20250514"

CVM_SYSTEM = """Você é um analista especialista em fundos de investimento brasileiros e dados da CVM.
Você tem acesso a dados de mais de 30.000 fundos, suas carteiras, métricas de performance e histórico de cotas.
Responda sempre em português brasileiro. Seja direto, preciso e cite dados específicos quando disponíveis.
Quando o usuário perguntar sobre um fundo específico, use o contexto fornecido."""

@router.post("/chat")
def chat(req: ChatRequest):
    if not client:
        raise HTTPException(500, "ANTHROPIC_API_KEY not configured")
    system = CVM_SYSTEM
    if req.context.get("fund_name"):
        system += f"\n\nContexto atual: O usuário está analisando o fundo {req.context['fund_name']} (CNPJ: {req.context.get('cnpj', 'N/A')})."

    def stream():
        try:
            with client.messages.stream(
                model=req.model,
                max_tokens=2048,
                system=system,
                messages=req.messages
            ) as s:
                for text in s.text_stream:
                    yield f"data: {json.dumps({'text': text})}\n\n"
        except anthropic.AuthenticationError as e:
            yield f"data: {json.dumps({'error': 'Chave de API Anthropic inválida. Configure uma chave válida no arquivo .env.'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': f'Erro no serviço de IA: {str(e)}'})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")
