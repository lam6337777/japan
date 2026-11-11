package com.nihongo.backend.userdata;

import static com.nihongo.backend.user.UserController.userId;

import com.nihongo.backend.common.ApiException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.regex.Pattern;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Đồng bộ dữ liệu cá nhân (danh sách sao, bộ từ, sổ lỗi, cài đặt...) theo tài khoản */
@RestController
@RequestMapping("/api/userdata")
public class UserDataController {

    private static final Pattern KEY = Pattern.compile("^[a-zA-Z0-9._-]{1,100}$");

    /** updatedAt tính bằng ms; accepted=false nghĩa là server đang giữ bản mới hơn (trả về bản đó) */
    public record Item(String key, String value, long updatedAt, Boolean accepted) {}

    public record PutRequest(@NotNull @Size(max = 2_000_000, message = "Dữ liệu quá lớn") String value, long updatedAt) {}

    private final UserDataRepository repo;

    public UserDataController(UserDataRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    @Transactional(readOnly = true)
    List<Item> all(@AuthenticationPrincipal Jwt jwt) {
        return repo.findAllByUser(userId(jwt)).stream()
                .map(d -> new Item(d.getKey(), d.getValue(), d.getUpdatedAt().toEpochMilli(), null))
                .toList();
    }

    @PutMapping("/{key}")
    @Transactional
    Item put(@AuthenticationPrincipal Jwt jwt, @PathVariable String key, @Valid @RequestBody PutRequest req) {
        if (!KEY.matcher(key).matches()) throw ApiException.badRequest("Khoá dữ liệu không hợp lệ");
        Long uid = userId(jwt);
        UserData d = repo.findById(new UserData.Key(uid, key)).orElse(null);
        if (d != null && d.getUpdatedAt().toEpochMilli() > req.updatedAt()) {
            return new Item(key, d.getValue(), d.getUpdatedAt().toEpochMilli(), false);
        }
        if (d == null) d = new UserData(uid, key);
        d.update(req.value(), Instant.ofEpochMilli(req.updatedAt()));
        repo.save(d);
        return new Item(key, req.value(), req.updatedAt(), true);
    }
}
