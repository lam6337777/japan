package com.nihongo.backend.auth;

import com.nihongo.backend.common.ApiException;
import com.nihongo.backend.user.User;
import com.nihongo.backend.user.UserController.UserDto;
import com.nihongo.backend.user.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Duration;
import java.time.Instant;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    public record RegisterRequest(
            @NotBlank(message = "Vui lòng nhập email") @Email(message = "Email không hợp lệ") String email,
            @NotBlank(message = "Vui lòng nhập mật khẩu") @Size(min = 6, max = 100, message = "Mật khẩu tối thiểu 6 ký tự") String password,
            @NotBlank(message = "Vui lòng nhập tên") @Size(max = 100, message = "Tên quá dài") String displayName) {}

    public record LoginRequest(@NotBlank(message = "Vui lòng nhập email") String email, @NotBlank(message = "Vui lòng nhập mật khẩu") String password) {}

    public record AuthResponse(String token, UserDto user) {}

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;
    private final Duration tokenTtl;

    public AuthController(UserRepository users, PasswordEncoder passwordEncoder, JwtEncoder jwtEncoder,
                          @Value("${app.jwt.expiration-days}") long expirationDays) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtEncoder = jwtEncoder;
        this.tokenTtl = Duration.ofDays(expirationDays);
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    AuthResponse register(@Valid @RequestBody RegisterRequest req) {
        String email = req.email().trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(email)) throw ApiException.badRequest("Email này đã được đăng ký");
        User user = users.save(new User(email, passwordEncoder.encode(req.password()), req.displayName().trim()));
        return new AuthResponse(issueToken(user), UserDto.of(user));
    }

    @PostMapping("/login")
    AuthResponse login(@Valid @RequestBody LoginRequest req) {
        User user = users.findByEmailIgnoreCase(req.email().trim())
                .filter(u -> passwordEncoder.matches(req.password(), u.getPasswordHash()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Email hoặc mật khẩu không đúng"));
        return new AuthResponse(issueToken(user), UserDto.of(user));
    }

    private String issueToken(User user) {
        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("nihongo-ai")
                .subject(user.getId().toString())
                .issuedAt(now)
                .expiresAt(now.plus(tokenTtl))
                .claim("email", user.getEmail())
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }
}
