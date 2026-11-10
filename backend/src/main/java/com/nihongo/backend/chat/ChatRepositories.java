package com.nihongo.backend.chat;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

interface ChatSessionRepository extends JpaRepository<ChatSession, Long> {

    List<ChatSession> findByUserIdOrderByUpdatedAtDesc(Long userId, Pageable pageable);

    Optional<ChatSession> findByIdAndUserId(Long id, Long userId);
}

interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findBySessionIdOrderByIdAsc(Long sessionId);

    /** Lấy các tin gần nhất (thứ tự mới → cũ) */
    List<ChatMessage> findBySessionIdOrderByIdDesc(Long sessionId, Pageable pageable);
}
