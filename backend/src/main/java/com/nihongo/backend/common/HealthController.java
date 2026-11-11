package com.nihongo.backend.common;

import com.nihongo.backend.chat.ChatbotClient;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    private final ChatbotClient chatbot;
    private final AtomicLong lastWake = new AtomicLong();

    public HealthController(ChatbotClient chatbot) {
        this.chatbot = chatbot;
    }

    /**
     * Frontend gọi khi mở app. Trên gói miễn phí các service "ngủ" khi không dùng,
     * nên tiện thể đánh thức luôn chatbot (chạy nền, tối đa 1 lần/phút).
     */
    @GetMapping("/api/health")
    Map<String, String> health() {
        long now = System.currentTimeMillis();
        long prev = lastWake.get();
        if (now - prev > 60_000 && lastWake.compareAndSet(prev, now)) {
            Thread.ofVirtual().start(chatbot::wake);
        }
        return Map.of("status", "ok");
    }
}
