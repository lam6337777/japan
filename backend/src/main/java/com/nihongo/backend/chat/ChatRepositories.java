package com.nihongo.backend.chat;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

interface ChatSessionRepository extends JpaRepository<ChatSession, Long> {

    List<ChatSession> findByUserIdOrderByUpdatedAtDesc(Long userId, Pageable pageable);

    Optional<ChatSession> findByIdAndUserId(Long id, Long userId);
}

interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findBySessionIdOrderByIdAsc(Long sessionId);

    /** Lấy các tin gần nhất (thứ tự mới → cũ) */
    List<ChatMessage> findBySessionIdOrderByIdDesc(Long sessionId, Pageable pageable);

    /** Tin nhắn của người học có góp ý sửa lỗi (mới nhất trước) */
    @Query("""
            select m from ChatMessage m
            where m.role = 'user' and m.corrections is not null and m.corrections <> '[]'
              and m.sessionId in (select s.id from ChatSession s where s.userId = :userId)
            order by m.id desc""")
    List<ChatMessage> findWithCorrections(Long userId, Pageable pageable);
}
