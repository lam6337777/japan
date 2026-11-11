"""Lớp gọi mô hình AI — đổi nhà cung cấp bằng AI_PROVIDER"""

import asyncio
import json
import logging

import httpx

from .config import settings

log = logging.getLogger("uvicorn.error")


class AIConfigError(Exception):
    """Lỗi cấu hình (thiếu key, key sai, hết tiền...) — báo rõ cho người dùng"""


class AIUpstreamError(Exception):
    """Nhà cung cấp AI lỗi tạm thời"""


_client = httpx.AsyncClient(timeout=httpx.Timeout(30, connect=10))


MAX_ATTEMPTS = 3


async def chat_json(system: str, messages: list[dict]) -> dict:
    if settings.ai_provider != "deepseek":
        raise AIConfigError(f'AI_PROVIDER "{settings.ai_provider}" chưa được hỗ trợ.')
    # Gọi lại (tối đa 3 lần) khi: JSON hỏng, mạng chập chờn / quá thời gian, DeepSeek quá tải (429, 5xx)
    last = "AI tạm thời trả lời lỗi, bạn gửi lại tin nhắn nhé."
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            return await _deepseek(system, messages)
        except _BadJSON:
            log.info("JSON hỏng, thử lại lần %d/%d", attempt, MAX_ATTEMPTS)
        except _Transient as e:
            last = str(e)
            log.warning("DeepSeek lỗi tạm thời (lần %d/%d): %s", attempt, MAX_ATTEMPTS, e)
            if attempt < MAX_ATTEMPTS:
                await asyncio.sleep(1.5 * attempt)
    raise AIUpstreamError(last)


async def _deepseek(system: str, messages: list[dict]) -> dict:
    if not settings.deepseek_api_key:
        raise AIConfigError("Chatbot chưa có DEEPSEEK_API_KEY. Thêm key vào file chatbot/.env rồi khởi động lại chatbot.")
    try:
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
    except httpx.TimeoutException as e:
        raise _Transient("AI phản hồi quá lâu, bạn gửi lại tin nhắn nhé.") from e
    except httpx.HTTPError as e:
        raise _Transient("Không kết nối được tới AI, bạn gửi lại tin nhắn nhé.") from e
    if res.status_code == 401:
        raise AIConfigError("API key DeepSeek không hợp lệ.")
    if res.status_code == 402:
        raise AIConfigError("Tài khoản DeepSeek hết tiền, hãy nạp thêm.")
    if res.status_code == 429 or res.status_code >= 500:
        raise _Transient("AI đang quá tải, bạn gửi lại tin nhắn sau ít giây nhé.")
    if res.status_code >= 400:
        raise AIUpstreamError(f"DeepSeek lỗi HTTP {res.status_code}: {res.text[:200]}")
    try:
        content = res.json()["choices"][0]["message"]["content"] or ""
    except (ValueError, KeyError, IndexError, TypeError) as e:
        raise _BadJSON() from e
    parsed = _parse_json(content)
    if parsed is None:
        log.warning("AI trả JSON không hợp lệ: %s", content[:500])
        raise _BadJSON()
    return parsed


class _BadJSON(Exception):
    pass


class _Transient(Exception):
    """Lỗi tạm thời (mạng, quá thời gian, quá tải) — nên gọi lại"""


def _parse_json(content: str) -> dict | None:
    """Đọc JSON; nếu AI chèn thêm chữ/```json thì cắt lấy phần {...}"""
    for candidate in (content, content[content.find("{") : content.rfind("}") + 1]):
        try:
            data = json.loads(candidate)
            if isinstance(data, dict):
                return data
        except (json.JSONDecodeError, ValueError):
            continue
    return None
