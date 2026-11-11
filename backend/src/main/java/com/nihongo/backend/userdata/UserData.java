package com.nihongo.backend.userdata;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.time.Instant;

@Entity
@Table(name = "user_data")
public class UserData {

    @Embeddable
    public record Key(@Column(name = "user_id") Long userId, @Column(name = "data_key") String dataKey) implements Serializable {}

    @EmbeddedId
    private Key id;

    @Column(nullable = false)
    private String value;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected UserData() {}

    public UserData(Long userId, String dataKey) {
        this.id = new Key(userId, dataKey);
    }

    public String getKey() { return id.dataKey(); }
    public String getValue() { return value; }
    public Instant getUpdatedAt() { return updatedAt; }

    public void update(String value, Instant updatedAt) {
        this.value = value;
        this.updatedAt = updatedAt;
    }
}
