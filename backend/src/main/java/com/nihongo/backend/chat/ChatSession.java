package com.nihongo.backend.chat;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "chat_sessions")
public class ChatSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String level;

    @Column(nullable = false)
    private String topic;

    @Column(name = "grammar_pattern")
    private String grammarPattern;

    @Column(name = "grammar_meaning")
    private String grammarMeaning;

    private String title;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected ChatSession() {}

    public ChatSession(Long userId, String level, String topic, String grammarPattern, String grammarMeaning) {
        this.userId = userId;
        this.level = level;
        this.topic = topic;
        this.grammarPattern = grammarPattern;
        this.grammarMeaning = grammarMeaning;
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public String getLevel() { return level; }
    public String getTopic() { return topic; }
    public String getGrammarPattern() { return grammarPattern; }
    public String getGrammarMeaning() { return grammarMeaning; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void touch() { this.updatedAt = Instant.now(); }
}
