package ru.fa.kpi.achievement;

import java.util.List;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
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
import ru.fa.kpi.common.CommentRequest;
import ru.fa.kpi.common.CurrentUser;

@RestController
@RequestMapping("/api/achievements")
@RequiredArgsConstructor
class AchievementController {

    private final AchievementService achievementService;
    private final AchievementWorkflowService workflow;

    @GetMapping
    List<AchievementDto> list(
            @RequestParam String scope,
            @RequestParam(required = false) ResultStatus status,
            @RequestParam(required = false) Long periodId,
            @RequestParam(required = false) Category category,
            @RequestParam(required = false) Long indicatorId,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) String q,
            @AuthenticationPrincipal CurrentUser actor) {
        AchievementFilter filter = new AchievementFilter(AchievementScope.parse(scope), status, periodId, category,
                indicatorId, userId, q);
        return achievementService.list(filter, actor.getId());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    AchievementDto create(@Valid @RequestBody AchievementRequest body, @AuthenticationPrincipal CurrentUser actor) {
        return achievementService.create(body, actor.getId());
    }

    @PostMapping("/check-duplicates")
    List<DuplicateDto> checkDuplicates(@Valid @RequestBody DuplicateQuery body) {
        return achievementService.checkDuplicates(body);
    }

    @GetMapping("/{id}")
    AchievementDto get(@PathVariable Long id, @AuthenticationPrincipal CurrentUser actor) {
        return achievementService.get(id, actor.getId());
    }

    @PutMapping("/{id}")
    AchievementDto update(@PathVariable Long id, @Valid @RequestBody AchievementRequest body,
                          @AuthenticationPrincipal CurrentUser actor) {
        return achievementService.update(id, body, actor.getId());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void delete(@PathVariable Long id, @AuthenticationPrincipal CurrentUser actor) {
        achievementService.delete(id, actor.getId());
    }

    @PostMapping("/{id}/submit")
    AchievementDto submit(@PathVariable Long id, @AuthenticationPrincipal CurrentUser actor) {
        return workflow.submit(id, actor.getId());
    }

    @PostMapping("/{id}/review")
    AchievementDto review(@PathVariable Long id, @Valid @RequestBody(required = false) DecisionRequest body,
                          @AuthenticationPrincipal CurrentUser actor) {
        return workflow.review(id, actor.getId(), body == null ? null : body.comment());
    }

    @PostMapping("/{id}/return")
    AchievementDto returnToAuthor(@PathVariable Long id, @Valid @RequestBody CommentRequest body,
                                  @AuthenticationPrincipal CurrentUser actor) {
        return workflow.returnToAuthor(id, actor.getId(), body.comment());
    }

    @PostMapping("/{id}/reject")
    AchievementDto reject(@PathVariable Long id, @Valid @RequestBody CommentRequest body,
                          @AuthenticationPrincipal CurrentUser actor) {
        return workflow.reject(id, actor.getId(), body.comment());
    }

    @PostMapping("/{id}/approve")
    AchievementDto approve(@PathVariable Long id, @Valid @RequestBody(required = false) DecisionRequest body,
                           @AuthenticationPrincipal CurrentUser actor) {
        return workflow.approve(id, actor.getId(), body == null ? null : body.comment());
    }
}
