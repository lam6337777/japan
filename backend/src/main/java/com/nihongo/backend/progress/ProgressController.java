package com.nihongo.backend.progress;

import static com.nihongo.backend.user.UserController.userId;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Đồng bộ tiến độ học giữa các thiết bị */
@RestController
@RequestMapping("/api/progress")
public class ProgressController {

    /** Cùng định dạng với CardState ở frontend (thời gian tính bằng ms) */
    public record CardDto(@NotBlank @Size(max = 200) String itemId, double ease, double interval, long due,
                          int reps, int lapses, long updatedAt) {}

    public record ProgressDto(List<CardDto> cards, List<LocalDate> studyDays) {}

    public record UpsertCardsRequest(@NotNull @Size(max = 1000, message = "Tối đa 1000 thẻ mỗi lần") List<@Valid CardDto> cards) {}

    public record StudyDayRequest(@NotNull LocalDate day) {}

    private final SrsCardRepository cards;
    private final StudyDayRepository studyDays;

    public ProgressController(SrsCardRepository cards, StudyDayRepository studyDays) {
        this.cards = cards;
        this.studyDays = studyDays;
    }

    @GetMapping
    @Transactional(readOnly = true)
    ProgressDto get(@AuthenticationPrincipal Jwt jwt) {
        Long uid = userId(jwt);
        return new ProgressDto(
                cards.findByUserId(uid).stream().map(SrsCard::toDto).toList(),
                studyDays.findAllByUser(uid).stream().map(StudyDay::getDay).toList());
    }

    /** Ghi nhiều thẻ; thẻ nào trên server mới hơn (updatedAt lớn hơn) thì giữ bản server */
    @PutMapping("/cards")
    @Transactional
    Map<String, Integer> upsertCards(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody UpsertCardsRequest req) {
        Long uid = userId(jwt);
        Map<String, SrsCard> existing = cards
                .findByUserIdAndItemIdIn(uid, req.cards().stream().map(CardDto::itemId).toList())
                .stream().collect(Collectors.toMap(SrsCard::getItemId, Function.identity()));
        int saved = 0;
        for (CardDto dto : req.cards()) {
            SrsCard card = existing.get(dto.itemId());
            if (card == null) {
                card = new SrsCard(uid, dto.itemId());
                existing.put(dto.itemId(), card);
            } else if (card.getUpdatedAt().toEpochMilli() >= dto.updatedAt()) {
                continue;
            }
            card.apply(dto);
            cards.save(card);
            saved++;
        }
        return Map.of("saved", saved);
    }

    @PostMapping("/study-days")
    @Transactional
    Map<String, String> markStudyDay(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody StudyDayRequest req) {
        Long uid = userId(jwt);
        StudyDay.Key key = new StudyDay.Key(uid, req.day());
        if (!studyDays.existsById(key)) studyDays.save(new StudyDay(uid, req.day()));
        return Map.of("status", "ok");
    }
}
