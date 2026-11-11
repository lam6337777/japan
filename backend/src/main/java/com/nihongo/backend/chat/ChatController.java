package com.nihongo.backend.chat;

import static com.nihongo.backend.user.UserController.userId;

import com.nihongo.backend.chat.ChatbotClient.Correction;
import com.nihongo.backend.chat.ChatbotClient.GrammarFocus;
import com.nihongo.backend.chat.ChatbotClient.Suggestion;
import com.nihongo.backend.common.ApiException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    public record SendRequest(
            Long sessionId,
            @Pattern(regexp = "n[1-5]", message = "Trình độ không hợp lệ") String level,
            @Size(max = 40) String topic,
            GrammarFocus grammar,
            @Size(max = 1000, message = "Tin nhắn tối đa 1000 ký tự") String message) {}

    public record MessageDto(Long id, String role, String content, String kana, String vi, List<Correction> corrections) {}

    public record SendResponse(Long sessionId, MessageDto userMessage, MessageDto assistantMessage, List<Suggestion> suggestions) {}

    public record SessionDto(Long id, String level, String topic, String grammarPattern, String title, Instant updatedAt) {}

    public record SessionDetail(SessionDto session, List<MessageDto> messages) {}

    public record MistakeDto(String id, Long sessionId, String sentence, String original, String corrected, String explanation, Instant createdAt) {}

    public record LookupRequest(@jakarta.validation.constraints.NotBlank @Size(max = 40) String word, @Size(max = 300) String context) {}

    private static final int HISTORY = 16;

    private final ChatSessionRepository sessions;
    private final ChatMessageRepository messages;
    private final ChatbotClient chatbot;
    private final JsonMapper json;

    public ChatController(ChatSessionRepository sessions, ChatMessageRepository messages, ChatbotClient chatbot, JsonMapper json) {
        this.sessions = sessions;
        this.messages = messages;
        this.chatbot = chatbot;
        this.json = json;
    }

    /**
     * Gửi 1 tin nhắn (hoặc message rỗng để AI mở đầu). Không bọc transaction quanh lời gọi AI
     * để không giữ kết nối database trong lúc chờ.
     */
    @PostMapping
    SendResponse send(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody SendRequest req) {
        Long uid = userId(jwt);
        ChatSession session = req.sessionId() == null
                ? sessions.save(new ChatSession(uid,
                        req.level() == null ? "n5" : req.level(),
                        req.topic() == null || req.topic().isBlank() ? "free" : req.topic(),
                        req.grammar() == null ? null : req.grammar().pattern(),
                        req.grammar() == null ? null : req.grammar().meaning()))
                : sessions.findByIdAndUserId(req.sessionId(), uid)
                        .orElseThrow(() -> ApiException.notFound("Không tìm thấy cuộc hội thoại"));

        String text = req.message() == null ? "" : req.message().trim();
        ChatMessage userMsg = null;
        if (!text.isEmpty()) {
            userMsg = messages.save(new ChatMessage(session.getId(), "user", text));
            if (session.getTitle() == null) session.setTitle(text.length() > 60 ? text.substring(0, 60) + "…" : text);
        }

        List<ChatbotClient.Msg> history = messages
                .findBySessionIdOrderByIdDesc(session.getId(), PageRequest.of(0, HISTORY))
                .reversed().stream()
                .map(m -> new ChatbotClient.Msg(m.getRole(), m.getContent()))
                .toList();
        GrammarFocus grammar = session.getGrammarPattern() == null ? null
                : new GrammarFocus(session.getGrammarPattern(), session.getGrammarMeaning());

        ChatbotClient.Reply reply;
        try {
            reply = chatbot.chat(new ChatbotClient.Request(session.getLevel(), session.getTopic(), grammar, history));
        } catch (RuntimeException e) {
            // AI không trả lời được → bỏ câu vừa lưu (frontend trả lại câu vào ô nhập để gửi lại, tránh lưu trùng)
            if (userMsg != null) messages.delete(userMsg);
            if (req.sessionId() == null) sessions.delete(session);
            throw e;
        }

        List<Correction> corrections = reply.corrections() == null ? List.of() : reply.corrections();
        if (userMsg != null) {
            userMsg.setCorrections(json.writeValueAsString(corrections));
            messages.save(userMsg);
        }
        ChatMessage aiMsg = new ChatMessage(session.getId(), "assistant", reply.reply());
        aiMsg.setKana(reply.replyKana());
        aiMsg.setVi(reply.replyVi());
        messages.save(aiMsg);
        session.touch();
        sessions.save(session);

        return new SendResponse(session.getId(),
                userMsg == null ? null : toDto(userMsg),
                toDto(aiMsg),
                reply.suggestions() == null ? List.of() : reply.suggestions());
    }

    /** Sổ lỗi sai: các lỗi (không tính gợi ý) mà AI đã sửa trong mọi cuộc hội thoại */
    @GetMapping("/mistakes")
    List<MistakeDto> mistakes(@AuthenticationPrincipal Jwt jwt) {
        return messages.findWithCorrections(userId(jwt), PageRequest.of(0, 300)).stream()
                .flatMap(m -> {
                    List<Correction> list = toDto(m).corrections();
                    return java.util.stream.IntStream.range(0, list == null ? 0 : list.size())
                            .filter(i -> !"tip".equals(list.get(i).type()))
                            .mapToObj(i -> new MistakeDto(m.getId() + "-" + i, m.getSessionId(), m.getContent(),
                                    list.get(i).original(), list.get(i).corrected(), list.get(i).explanation(), m.getCreatedAt()));
                })
                .toList();
    }

    /** Tra nghĩa 1 từ trong ngữ cảnh câu (gọi chatbot) */
    @PostMapping("/lookup")
    ChatbotClient.LookupReply lookup(@Valid @RequestBody LookupRequest req) {
        return chatbot.lookup(new ChatbotClient.LookupRequest(req.word().trim(), req.context() == null ? "" : req.context()));
    }

    @GetMapping("/sessions")
    List<SessionDto> listSessions(@AuthenticationPrincipal Jwt jwt) {
        return sessions.findByUserIdOrderByUpdatedAtDesc(userId(jwt), PageRequest.of(0, 30)).stream()
                .filter(s -> s.getTitle() != null) // bỏ cuộc trò chuyện chưa có tin nhắn của người học
                .map(this::toDto)
                .toList();
    }

    @GetMapping("/sessions/{id}")
    SessionDetail getSession(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        ChatSession s = sessions.findByIdAndUserId(id, userId(jwt))
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy cuộc hội thoại"));
        return new SessionDetail(toDto(s), messages.findBySessionIdOrderByIdAsc(id).stream().map(this::toDto).toList());
    }

    @DeleteMapping("/sessions/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteSession(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        ChatSession s = sessions.findByIdAndUserId(id, userId(jwt))
                .orElseThrow(() -> ApiException.notFound("Không tìm thấy cuộc hội thoại"));
        sessions.delete(s);
    }

    private SessionDto toDto(ChatSession s) {
        return new SessionDto(s.getId(), s.getLevel(), s.getTopic(), s.getGrammarPattern(), s.getTitle(), s.getUpdatedAt());
    }

    private MessageDto toDto(ChatMessage m) {
        List<Correction> corrections = m.getCorrections() == null ? null
                : json.readValue(m.getCorrections(), new TypeReference<List<Correction>>() {});
        return new MessageDto(m.getId(), m.getRole(), m.getContent(), m.getKana(), m.getVi(), corrections);
    }
}
