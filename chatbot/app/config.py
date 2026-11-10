"""Cấu hình đọc từ biến môi trường / file .env"""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


class Settings:
    ai_provider: str = os.getenv("AI_PROVIDER", "deepseek")
    deepseek_api_key: str = os.getenv("DEEPSEEK_API_KEY", "")
    deepseek_model: str = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
    # Khoá nội bộ: chỉ backend (biết khoá này) mới gọi được chatbot
    internal_key: str = os.getenv("CHATBOT_INTERNAL_KEY", "dev-internal-key")
    max_history: int = int(os.getenv("MAX_HISTORY", "16"))


settings = Settings()
