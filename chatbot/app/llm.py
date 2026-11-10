"""Lớp gọi mô hình AI — đổi nhà cung cấp bằng AI_PROVIDER"""

import json

import httpx

from .config import settings


class AIConfigError(Exception):
    """Lỗi cấu hình (thiếu key, key sai, hết tiền...) — báo rõ cho người dùng"""


class AIUpstreamError(Exception):
    """Nhà cung cấp AI lỗi tạm thời"""


_client = httpx.AsyncClient(timeout=60)


async def chat_json(system: str, messages: list[dict]) -> dict:
    if settings.ai_provider == "deepseek":
        return await _deepseek(system, messages)
    raise AIConfigError(f'AI_PROVIDER "{settings.ai_provider}" chưa được hỗ trợ.')


async def _deepseek(system: str, messages: list[dict]) -> dict:
    if not settings.deepseek_api_key:
        raise AIConfigError("Chatbot chưa có DEEPSEEK_API_KEY. Thêm key vào file chatbot/.env rồi khởi động lại chatbot.")
    res = await _client.post(
        "https://api.deepseek.com/chat/completions",
        headers={"Authorization": f"Bearer {settings.deepseek_api_key}"},
        json={
            "model": settings.deepseek_model,
            "response_format": {"type": "json_object"},
            "temperature": 0.8,
            "max_tokens": 1200,
            "messages": [{"role": "system", "content": system}, *messages],
        },
    )
    if res.status_code == 401:
        raise AIConfigError("API key DeepSeek không hợp lệ.")
    if res.status_code == 402:
        raise AIConfigError("Tài khoản DeepSeek hết tiền, hãy nạp thêm.")
    if res.status_code >= 400:
        raise AIUpstreamError(f"DeepSeek lỗi HTTP {res.status_code}: {res.text[:200]}")
    content = res.json()["choices"][0]["message"]["content"] or "{}"
    try:
        return json.loads(content)
    except json.JSONDecodeError as e:
        raise AIUpstreamError("AI trả về dữ liệu không đúng định dạng JSON") from e
