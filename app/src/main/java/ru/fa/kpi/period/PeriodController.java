package ru.fa.kpi.period;

import java.util.List;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import ru.fa.kpi.common.CommentRequest;
import ru.fa.kpi.common.CurrentUser;

@RestController
@RequestMapping("/api/periods")
@RequiredArgsConstructor
class PeriodController {

    private final PeriodService periodService;

    @GetMapping
    List<PeriodDto> list() {
        return periodService.list();
    }

    @GetMapping("/current")
    PeriodDto current() {
        return periodService.current();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    PeriodDto create(@Valid @RequestBody PeriodRequest body) {
        return periodService.create(body);
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("hasRole('ADMIN')")
    PeriodDto close(@PathVariable Long id, @AuthenticationPrincipal CurrentUser actor) {
        return periodService.close(id, actor.getId());
    }

    @PostMapping("/{id}/reopen")
    @PreAuthorize("hasRole('DIRECTOR')")
    PeriodDto reopen(@PathVariable Long id, @Valid @RequestBody CommentRequest body,
                     @AuthenticationPrincipal CurrentUser actor) {
        return periodService.reopen(id, actor.getId(), body.comment());
    }
}
