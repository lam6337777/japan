package com.nihongo.backend.user;

import com.nihongo.backend.common.ApiException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me")
public class UserController {

    public record UserDto(Long id, String email, String displayName, String level) {
        public static UserDto of(User u) {
            return new UserDto(u.getId(), u.getEmail(), u.getDisplayName(), u.getLevel());
        }
    }

    public record UpdateMeRequest(
            @Size(min = 1, max = 100, message = "Tên hiển thị từ 1–100 ký tự") String displayName,
            @Pattern(regexp = "n[1-5]", message = "Trình độ không hợp lệ") String level) {}

    private final UserRepository users;

    public UserController(UserRepository users) {
        this.users = users;
    }

    public static Long userId(Jwt jwt) {
        return Long.parseLong(jwt.getSubject());
    }

    @GetMapping
    UserDto me(@AuthenticationPrincipal Jwt jwt) {
        return UserDto.of(load(userId(jwt)));
    }

    @PatchMapping
    @Transactional
    UserDto update(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody UpdateMeRequest req) {
        User u = load(userId(jwt));
        if (req.displayName() != null) u.setDisplayName(req.displayName().trim());
        if (req.level() != null) u.setLevel(req.level());
        return UserDto.of(u);
    }

    private User load(Long id) {
        return users.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy tài khoản"));
    }
}
