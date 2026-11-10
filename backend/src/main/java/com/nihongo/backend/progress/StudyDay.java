package com.nihongo.backend.progress;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.LocalDate;

/** Ngày có học (để tính chuỗi ngày học) */
@Entity
@Table(name = "study_days")
public class StudyDay {

    @Embeddable
    public record Key(@Column(name = "user_id") Long userId, @Column(name = "day") LocalDate day) implements Serializable {}

    @EmbeddedId
    private Key id;

    protected StudyDay() {}

    public StudyDay(Long userId, LocalDate day) {
        this.id = new Key(userId, day);
    }

    public LocalDate getDay() {
        return id.day();
    }
}
