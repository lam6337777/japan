CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name  VARCHAR(100) NOT NULL,
    level         VARCHAR(2)   NOT NULL DEFAULT 'n5',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Trạng thái ôn tập ngắt quãng của từng thẻ (từ vựng)
CREATE TABLE srs_cards (
    id            BIGSERIAL PRIMARY KEY,
    user_id       BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id       VARCHAR(200) NOT NULL,
    ease          DOUBLE PRECISION NOT NULL,
    interval_days DOUBLE PRECISION NOT NULL,
    due_at        TIMESTAMPTZ  NOT NULL,
    reps          INT          NOT NULL,
    lapses        INT          NOT NULL,
    updated_at    TIMESTAMPTZ  NOT NULL,
    UNIQUE (user_id, item_id)
);

CREATE TABLE study_days (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day     DATE   NOT NULL,
    PRIMARY KEY (user_id, day)
);

CREATE TABLE chat_sessions (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level           VARCHAR(2)  NOT NULL,
    topic           VARCHAR(40) NOT NULL,
    grammar_pattern VARCHAR(200),
    grammar_meaning VARCHAR(200),
    title           VARCHAR(200),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id, updated_at DESC);

CREATE TABLE chat_messages (
    id          BIGSERIAL PRIMARY KEY,
    session_id  BIGINT      NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role        VARCHAR(10) NOT NULL,
    content     TEXT        NOT NULL,
    kana        TEXT,
    vi          TEXT,
    corrections TEXT,       -- JSON
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, id);
