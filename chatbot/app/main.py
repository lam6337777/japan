"""Chatbot service — chỉ backend gọi vào (có khoá nội bộ)

Chạy: .venv\\Scripts\\python -m uvicorn app.main:app --port 8000 --reload
"""

import json
import secrets

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import ValidationError

from .config import settings
from .llm import AIConfigError, AIUpstreamError, chat_json
from .prompts import START_MESSAGE, TOPICS, build_system_prompt
from .schemas import ChatReply, ChatRequest

app = FastAPI(title="Nihongo AI — Chatbot", version="0.1.0")


def require_internal_key(x_internal_key: str = Header(default="")):
    if not secrets.compare_digest(x_internal_key, settings.internal_key):
        raise HTTPException(status_code=401, detail="Sai khoá nội bộ")


@app.get("/health")
def health():
    return {"status": "ok", "provider": settings.ai_provider, "has_key": bool(settings.deepseek_api_key)}


@app.get("/topics")
def topics():
    return {k: v["label"] for k, v in TOPICS.items()}


@app.post("/chat", response_model=ChatReply, dependencies=[Depends(require_internal_key)])
async def chat(req: ChatRequest) -> ChatReply:
    system = build_system_prompt(req.level, req.topic, req.grammar)
    # Tin cũ của AI phải ở dạng JSON giống đầu ra; nếu để chữ thường, DeepSeek (chế độ JSON)
    # dễ bị lệch định dạng và trả về chuỗi rỗng.
    history = [
        {"role": m.role, "content": json.dumps({"reply": m.content}, ensure_ascii=False) if m.role == "assistant" else m.content}
        for m in req.messages
    ][-settings.max_history :]
    if not history:
        history = [{"role": "user", "content": START_MESSAGE}]

    try:
        raw = await chat_json(system, history)
    except AIConfigError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except AIUpstreamError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    # Lọc bỏ mục thiếu dữ liệu thay vì làm hỏng cả câu trả lời
    raw["corrections"] = [
        {**c, "type": c.get("type") if c.get("type") in ("error", "tip") else "error"}
        for c in raw.get("corrections") or []
        if isinstance(c, dict) and c.get("corrected")
    ]
    raw["suggestions"] = [s for s in raw.get("suggestions") or [] if isinstance(s, dict) and s.get("ja")][:3]
    try:
        reply = ChatReply.model_validate(raw)
    except ValidationError as e:
        raise HTTPException(status_code=502, detail="AI trả về thiếu dữ liệu") from e
    if not reply.reply:
        raise HTTPException(status_code=502, detail="AI trả về câu trả lời rỗng")
    return reply
