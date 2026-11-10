"""Kiểu dữ liệu vào/ra của chatbot (backend gọi theo đúng định dạng này)"""

from typing import Literal

from pydantic import BaseModel, Field


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=2000)


class GrammarFocus(BaseModel):
    pattern: str
    meaning: str


class ChatRequest(BaseModel):
    level: Literal["n5", "n4", "n3", "n2", "n1"] = "n5"
    topic: str = "free"
    grammar: GrammarFocus | None = None
    messages: list[Message] = []


class Correction(BaseModel):
    type: Literal["error", "tip"] = "error"
    original: str = ""
    corrected: str
    explanation: str = ""


class Suggestion(BaseModel):
    ja: str
    vi: str = ""


class ChatReply(BaseModel):
    reply: str
    reply_kana: str = ""
    reply_vi: str = ""
    corrections: list[Correction] = []
    suggestions: list[Suggestion] = []
