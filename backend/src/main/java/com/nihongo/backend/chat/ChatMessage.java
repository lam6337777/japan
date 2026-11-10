package com.nihongo.backend.chat;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "chat_messages")
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @Column(nullable = false)
    private String role; // "user" | "assistant"

    @Column(nullable = false)
    private String content;

    private String kana;
    private String vi;

    /** Danh sách gợi ý sửa lỗi (JSON) — chỉ có ở tin nhắn của người học */
    private String corrections;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected ChatMessage() {}

    public ChatMessage(Long sessionId, String role, String content) {
        this.sessionId = sessionId;
        this.role = role;
        this.content = content;
    }

    public Long getId() { return id; }
    public Long getSessionId() { return sessionId; }
    public String getRole() { return role; }
    public String getContent() { return content; }
    public String getKana() { return kana; }
    public void setKana(String kana) { this.kana = kana; }
    public String getVi() { return vi; }
    public void setVi(String vi) { this.vi = vi; }
    public String getCorrections() { return corrections; }
    public void setCorrections(String corrections) { this.corrections = corrections; }
}
