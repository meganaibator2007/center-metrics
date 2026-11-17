package ru.fa.kpi.report;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ru.fa.kpi.common.CurrentUser;

@RestController
@RequiredArgsConstructor
class ScoresController {

    private final ReportService reportService;

    @GetMapping("/api/scores/my")
    MyScoresDto my(@RequestParam(required = false) Long periodId, @AuthenticationPrincipal CurrentUser actor) {
        return reportService.scores(actor.getId(), periodId, actor.getId());
    }

    @GetMapping("/api/scores/users/{id}")
    MyScoresDto user(@PathVariable Long id, @RequestParam(required = false) Long periodId,
                     @AuthenticationPrincipal CurrentUser actor) {
        return reportService.scores(id, periodId, actor.getId());
    }
}
