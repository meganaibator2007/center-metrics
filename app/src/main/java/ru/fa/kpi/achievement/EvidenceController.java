package ru.fa.kpi.achievement;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import ru.fa.kpi.common.CurrentUser;
import ru.fa.kpi.common.FieldValidationException;

@RestController
@RequestMapping("/api/achievements/{id}/evidence")
@RequiredArgsConstructor
class EvidenceController {

    private final EvidenceService evidenceService;

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    EvidenceDto addLink(@PathVariable Long id, @Valid @RequestBody EvidenceLinkRequest body,
                        @AuthenticationPrincipal CurrentUser actor) {
        return evidenceService.addLink(id, body, actor.getId());
    }

    /** Файл пока не принимается: понятная ошибка по полю вместо 415. */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    EvidenceDto upload(@PathVariable Long id) {
        throw new FieldValidationException("file", "Загрузка файлов появится в следующей версии: пока приложите ссылку на документ");
    }

    @GetMapping("/{evidenceId}/file")
    ResponseEntity<Void> download(@PathVariable Long id, @PathVariable Long evidenceId,
                                  @AuthenticationPrincipal CurrentUser actor) {
        evidenceService.requireFile(id, evidenceId, actor.getId());
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{evidenceId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void remove(@PathVariable Long id, @PathVariable Long evidenceId, @AuthenticationPrincipal CurrentUser actor) {
        evidenceService.remove(id, evidenceId, actor.getId());
    }
}
