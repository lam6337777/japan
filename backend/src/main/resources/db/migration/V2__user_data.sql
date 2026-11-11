-- Dữ liệu cá nhân dạng khoá–giá trị (danh sách sao, bộ từ tự nhập, sổ lỗi, cài đặt...)
-- Giá trị là JSON do frontend quản lý; đồng bộ theo "bản sửa sau cùng thắng"
CREATE TABLE user_data (
    user_id    BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data_key   VARCHAR(100) NOT NULL,
    value      TEXT         NOT NULL,
    updated_at TIMESTAMPTZ  NOT NULL,
    PRIMARY KEY (user_id, data_key)
);
