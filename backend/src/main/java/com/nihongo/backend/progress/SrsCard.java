package com.nihongo.backend.progress;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

/** Trạng thái ôn tập ngắt quãng của 1 thẻ từ vựng */
@Entity
@Table(name = "srs_cards")
public class SrsCard {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "item_id", nullable = false)
    private String itemId;

    private double ease;

    @Column(name = "interval_days")
    private double intervalDays;

    @Column(name = "due_at", nullable = false)
    private Instant dueAt;

    private int reps;
    private int lapses;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected SrsCard() {}

    public SrsCard(Long userId, String itemId) {
        this.userId = userId;
        this.itemId = itemId;
    }

    public void apply(ProgressController.CardDto dto) {
        this.ease = dto.ease();
        this.intervalDays = dto.interval();
        this.dueAt = Instant.ofEpochMilli(dto.due());
        this.reps = dto.reps();
        this.lapses = dto.lapses();
        this.updatedAt = Instant.ofEpochMilli(dto.updatedAt());
    }

    public ProgressController.CardDto toDto() {
        return new ProgressController.CardDto(itemId, ease, intervalDays, dueAt.toEpochMilli(), reps, lapses, updatedAt.toEpochMilli());
    }

    public String getItemId() { return itemId; }
    public Instant getUpdatedAt() { return updatedAt; }
}
