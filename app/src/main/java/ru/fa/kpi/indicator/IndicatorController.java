package ru.fa.kpi.indicator;

import java.util.List;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import ru.fa.kpi.common.Category;
import ru.fa.kpi.common.CurrentUser;

@RestController
@RequestMapping("/api/indicators")
@RequiredArgsConstructor
class IndicatorController {

    private final IndicatorService indicatorService;

    @GetMapping
    List<IndicatorDto> list(
            @RequestParam(required = false) Category category,
            @RequestParam(required = false) EvaluationType evaluationType,
            @RequestParam(required = false) Boolean archived) {
        return indicatorService.list(category, evaluationType, archived);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    IndicatorDto create(@Valid @RequestBody IndicatorRequest body, @AuthenticationPrincipal CurrentUser actor) {
        return indicatorService.create(body, actor.getId());
    }

    @GetMapping("/{id}")
    IndicatorDto get(@PathVariable Long id) {
        return indicatorService.get(id);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    IndicatorDto update(@PathVariable Long id, @Valid @RequestBody IndicatorRequest body,
                        @AuthenticationPrincipal CurrentUser actor) {
        return indicatorService.update(id, body, actor.getId());
    }

    @PostMapping("/{id}/archive")
    @PreAuthorize("hasRole('ADMIN')")
    IndicatorDto toggleArchive(@PathVariable Long id) {
        return indicatorService.toggleArchive(id);
    }

    @GetMapping("/{id}/versions")
    List<IndicatorVersionDto> versions(@PathVariable Long id) {
        return indicatorService.versions(id);
    }
}
