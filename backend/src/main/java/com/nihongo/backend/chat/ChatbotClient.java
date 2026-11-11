package com.nihongo.backend.chat;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.nihongo.backend.common.ApiException;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.json.JsonMapper;

/** Gọi sang chatbot service (Python FastAPI) */
@Component
public class ChatbotClient {

    public record GrammarFocus(String pattern, String meaning) {}

    public record Msg(String role, String content) {}

    public record Request(String level, String topic, GrammarFocus grammar, List<Msg> messages) {}

    /** type: "error" (lỗi sai) hoặc "tip" (câu đúng, gợi ý cách nói tự nhiên hơn) */
    public record Correction(String type, String original, String corrected, String explanation) {}

    public record Suggestion(String ja, String vi) {}

    public record Reply(String reply,
                        @JsonProperty("reply_kana") String replyKana,
                        @JsonProperty("reply_vi") String replyVi,
                        List<Correction> corrections,
                        List<Suggestion> suggestions) {}

    public record LookupRequest(String word, String context) {}

    public record LookupReply(String word, String reading,
                              @JsonProperty("dictionary_form") String dictionaryForm,
                              @JsonProperty("meaning_vi") String meaningVi,
                              String note) {}

    private final RestClient http;
    private final JsonMapper json;

    public ChatbotClient(JsonMapper json,
                         @Value("${app.chatbot.url}") String baseUrl,
                         @Value("${app.chatbot.internal-key}") String internalKey) {
        this.json = json;
        // uvicorn chỉ hỗ trợ HTTP/1.1 → tắt nâng cấp HTTP/2 mặc định của Java HttpClient
        HttpClient client = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(5))
                .build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(client);
        factory.setReadTimeout(Duration.ofSeconds(110));
        this.http = RestClient.builder()
                .requestFactory(factory)
                .baseUrl(baseUrl)
                .defaultHeader("X-Internal-Key", internalKey)
                .build();
    }

    /** Gọi /health để đánh thức chatbot (bỏ qua mọi lỗi) */
    public void wake() {
        try {
            http.get().uri("/health").retrieve().toBodilessEntity();
        } catch (Exception ignored) {
            // chatbot chưa sẵn sàng cũng không sao
        }
    }

    public Reply chat(Request request) {
        return post("/chat", request, Reply.class);
    }

    public LookupReply lookup(LookupRequest request) {
        return post("/lookup", request, LookupReply.class);
    }

    /** Chatbot đang ngủ / đang khởi động (gói miễn phí): lỗi cổng không kèm "detail" hoặc chưa kết nối được */
    private static final class Waking extends RuntimeException {
        Waking() {
            super(null, null, false, false);
        }
    }

    /** Tổng thời gian chờ chatbot thức dậy trước khi báo lỗi */
    private static final long WAKE_BUDGET_MS = 75_000;

    private <T> T post(String uri, Object request, Class<T> type) {
        long deadline = System.currentTimeMillis() + WAKE_BUDGET_MS;
        for (int attempt = 1; ; attempt++) {
            try {
                return postOnce(uri, request, type);
            } catch (Waking | ResourceAccessException e) {
                if (System.currentTimeMillis() + 3000 > deadline) {
                    throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                            "Chatbot đang khởi động (máy chủ miễn phí ngủ khi lâu không dùng). Bạn gửi lại sau khoảng 30 giây nhé.");
                }
                try {
                    Thread.sleep(Math.min(2000L * attempt, 6000L));
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Chatbot chưa sẵn sàng, bạn gửi lại nhé.");
                }
            }
        }
    }

    private <T> T postOnce(String uri, Object request, Class<T> type) {
        return http.post()
                .uri(uri)
                .body(request)
                .retrieve()
                .onStatus(HttpStatusCode::isError, (req, res) -> {
                    int code = res.getStatusCode().value();
                    String detail = null;
                    try {
                        Object d = json.readValue(res.getBody(), Map.class).get("detail");
                        if (d instanceof String s) detail = s;
                    } catch (Exception ignored) {
                        // không phải JSON của chatbot (trang lỗi của Render khi đang khởi động...)
                    }
                    if (detail == null && code >= 502 && code <= 504) throw new Waking();
                    HttpStatus status = code == 400 ? HttpStatus.BAD_REQUEST : HttpStatus.BAD_GATEWAY;
                    throw new ApiException(status, detail != null ? detail : "Chatbot gặp lỗi (HTTP " + code + "), bạn gửi lại tin nhắn nhé.");
                })
                .body(type);
    }
}
