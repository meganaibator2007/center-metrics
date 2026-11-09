package ru.fa.kpi.user;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.data.web.PagedModel;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import ru.fa.kpi.common.CurrentUser;

@RestController
@RequiredArgsConstructor
class UserController {

    private final UserService userService;

    @GetMapping("/api/users")
    @PreAuthorize("hasAnyRole('ADMIN', 'DIRECTOR')")
    PagedModel<UserDto> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) Category category,
            @RequestParam(required = false) Long departmentId,
            @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return new PagedModel<>(userService.search(new UserFilter(q, role, category, departmentId, active), page, size));
    }

    @PostMapping("/api/users")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    UserDto create(@Valid @RequestBody UserRequest body, @AuthenticationPrincipal CurrentUser actor) {
        return userService.create(body, actor.getId());
    }

    @GetMapping("/api/users/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'DIRECTOR')")
    UserDto get(@PathVariable Long id) {
        return userService.getById(id);
    }

    @PutMapping("/api/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    UserDto update(@PathVariable Long id, @Valid @RequestBody UserRequest body, @AuthenticationPrincipal CurrentUser actor) {
        return userService.update(id, body, actor.getId());
    }

    @PatchMapping("/api/users/{id}/active")
    @PreAuthorize("hasRole('ADMIN')")
    UserDto setActive(@PathVariable Long id, @Valid @RequestBody ActiveRequest body, @AuthenticationPrincipal CurrentUser actor) {
        return userService.setActive(id, body.active(), actor.getId());
    }

    @PostMapping("/api/users/{id}/reset-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    void resetPassword(@PathVariable Long id, @Valid @RequestBody ResetPasswordRequest body) {
        userService.resetPassword(id, body.password());
    }

    @GetMapping("/api/users/{id}/history")
    @PreAuthorize("hasAnyRole('ADMIN', 'DIRECTOR')")
    List<EmploymentRecordDto> history(@PathVariable Long id) {
        return userService.history(id);
    }

    @GetMapping("/api/employees")
    List<PersonShort> employees() {
        return userService.listEmployees();
    }
}
